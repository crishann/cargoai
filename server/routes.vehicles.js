const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { getPool, initDatabase } = require("./db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const uploadsDir = path.join(__dirname, "uploads", "vehicles");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 40);
    cb(null, `${Date.now()}-${safeBase || "vehicle"}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { files: 3, fileSize: 5 * 1024 * 1024 },
});

function isDatabaseUnavailableError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  return (
    code === "EACCES" ||
    code === "ETIMEDOUT" ||
    message.includes("database not initialized") ||
    message.includes("database unavailable") ||
    message.includes("connection timeout") ||
    message.includes("connection terminated") ||
    message.includes("connect timeout") ||
    message.includes("timed out")
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "missing auth token" });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "invalid auth token" });
  }
}

async function getOwnerIdByUserId(pool, userId) {
  const [rows] = await pool.query(
    "SELECT owner_id FROM car_owners WHERE user_id = ? LIMIT 1",
    [userId]
  );

  return rows[0]?.owner_id || null;
}

async function getVehicleImagesByIds(pool, vehicleIds) {
  if (vehicleIds.length === 0) return new Map();

  const placeholders = vehicleIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT image_id, vehicle_id, image_url, COALESCE(is_primary, 0) AS is_primary
     FROM vehicle_image
     WHERE vehicle_id IN (${placeholders})
     ORDER BY vehicle_id, is_primary DESC, image_id ASC`,
    vehicleIds
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.vehicle_id)) map.set(row.vehicle_id, []);
    map.get(row.vehicle_id).push({
      imageId: row.image_id,
      imageUrl: row.image_url,
      isPrimary: Boolean(row.is_primary),
    });
  }
  return map;
}

async function getVehicleReviewsByIds(pool, vehicleIds) {
  if (vehicleIds.length === 0) {
    return { reviewMap: new Map(), summaryMap: new Map() };
  }

  const placeholders = vehicleIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT
       rv.review_id,
       rv.vehicle_id,
       rv.car_rating,
       rv.experience_rating,
       rv.review_text,
       rv.owner_response,
       rv.owner_responded_at,
       rv.created_at,
       u.username AS renter_username
     FROM reviews rv
     INNER JOIN car_renter r ON r.renter_id = rv.renter_id
     INNER JOIN \`user\` u ON u.user_id = r.user_id
     WHERE rv.vehicle_id IN (${placeholders})
     ORDER BY rv.created_at DESC, rv.review_id DESC`,
    vehicleIds
  );

  const reviewMap = new Map();
  const summaryMap = new Map();

  for (const row of rows) {
    if (!reviewMap.has(row.vehicle_id)) reviewMap.set(row.vehicle_id, []);
    reviewMap.get(row.vehicle_id).push({
      reviewId: row.review_id,
      renterName: row.renter_username || "Renter",
      carRating: row.car_rating === null ? null : Number(row.car_rating),
      experienceRating: row.experience_rating === null ? null : Number(row.experience_rating),
      averageRating: ((Number(row.car_rating || 0) + Number(row.experience_rating || 0)) / 2),
      reviewText: row.review_text || "",
      ownerResponse: row.owner_response || "",
      ownerRespondedAt: row.owner_responded_at,
      createdAt: row.created_at,
    });

    if (!summaryMap.has(row.vehicle_id)) {
      summaryMap.set(row.vehicle_id, { reviewCount: 0, totalAverage: 0, totalCar: 0, totalExperience: 0 });
    }

    const summary = summaryMap.get(row.vehicle_id);
    summary.reviewCount += 1;
    summary.totalCar += Number(row.car_rating || 0);
    summary.totalExperience += Number(row.experience_rating || 0);
    summary.totalAverage += (Number(row.car_rating || 0) + Number(row.experience_rating || 0)) / 2;
  }

  return { reviewMap, summaryMap };
}

async function deleteImageFiles(imageRows) {
  await Promise.all(
    imageRows.map(async (row) => {
      if (!row.image_url) return;
      const relativePath = String(row.image_url).replace(/^\/+/, "").split("/").join(path.sep);
      const filePath = path.join(__dirname, relativePath);
      if (filePath.startsWith(path.join(__dirname, "uploads"))) {
        await fs.promises.unlink(filePath).catch(() => {});
      }
    })
  );
}

function parseVehiclePayload(body = {}) {
  const {
    brand,
    model,
    carType,
    year,
    seatCapacity,
    plateNumber,
    ratePerDay,
    features = "",
    status = "inactive",
  } = body;

  const parsedYear = Number(year);
  const parsedSeatCapacity = Number(seatCapacity);
  const parsedRate = Number(ratePerDay);
  const normalizedStatus = ["available", "booked", "maintenance", "inactive"].includes(status)
    ? status
    : "inactive";

  return {
    brand: String(brand || "").trim(),
    model: String(model || "").trim(),
    carType: String(carType || "").trim(),
    year: parsedYear,
    seatCapacity: parsedSeatCapacity,
    plateNumber: String(plateNumber || "").trim(),
    ratePerDay: parsedRate,
    features: String(features || "").trim(),
    status: normalizedStatus,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT
         v.vehicle_id,
         v.owner_id,
         v.brand,
         v.model,
         v.car_type,
         v.year,
         v.seat_capacity,
         v.plate_number,
         v.rate_per_day,
         v.features,
         COALESCE(v.status, 'inactive') AS status,
         v.created_at,
         primary_image.image_url AS primary_image_url,
         COUNT(vi.image_id) AS image_count
       FROM vehicles v
       LEFT JOIN vehicle_image vi
         ON vi.vehicle_id = v.vehicle_id
       LEFT JOIN vehicle_image primary_image
         ON primary_image.vehicle_id = v.vehicle_id AND primary_image.is_primary = 1
       WHERE v.owner_id = ?
       GROUP BY
         v.vehicle_id, v.owner_id, v.brand, v.model, v.car_type, v.year, v.seat_capacity, v.plate_number,
         v.rate_per_day, v.features, v.status, v.created_at, primary_image.image_url
       ORDER BY v.created_at DESC, v.vehicle_id DESC`,
      [ownerId]
    );

    const vehicleIds = rows.map((row) => row.vehicle_id);
    const imageMap = await getVehicleImagesByIds(pool, vehicleIds);
    const { reviewMap, summaryMap } = await getVehicleReviewsByIds(pool, vehicleIds);

    return res.json({
      ownerId,
      vehicles: rows.map((row) => ({
        reviewSummary: summaryMap.has(row.vehicle_id)
          ? {
              reviewCount: summaryMap.get(row.vehicle_id).reviewCount,
              averageRating: Number((summaryMap.get(row.vehicle_id).totalAverage / summaryMap.get(row.vehicle_id).reviewCount).toFixed(1)),
              averageCarRating: Number((summaryMap.get(row.vehicle_id).totalCar / summaryMap.get(row.vehicle_id).reviewCount).toFixed(1)),
              averageExperienceRating: Number((summaryMap.get(row.vehicle_id).totalExperience / summaryMap.get(row.vehicle_id).reviewCount).toFixed(1)),
            }
          : {
              reviewCount: 0,
              averageRating: null,
              averageCarRating: null,
              averageExperienceRating: null,
            },
        vehicleId: row.vehicle_id,
        ownerId: row.owner_id,
        title: `${row.brand} ${row.model}`.trim(),
        brand: row.brand,
        model: row.model,
        carType: row.car_type || "",
        year: row.year,
        seatCapacity: row.seat_capacity === null ? null : Number(row.seat_capacity),
        plateNumber: row.plate_number,
        ratePerDay: Number(row.rate_per_day),
        features: row.features || "",
        status: row.status || "inactive",
        imageUrl: row.primary_image_url || "",
        imageCount: Number(row.image_count || 0),
        images: imageMap.get(row.vehicle_id) || [],
        reviews: reviewMap.get(row.vehicle_id) || [],
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Vehicle list error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/", requireAuth, upload.array("images", 3), async (req, res) => {
  const files = req.files || [];
  const payload = parseVehiclePayload(req.body);

  if (!payload.brand || !payload.model || !payload.carType || !payload.year || !payload.seatCapacity || !payload.plateNumber || !payload.ratePerDay) {
    return res.status(400).json({ message: "brand, model, carType, year, seatCapacity, plateNumber and ratePerDay are required" });
  }

  if (!Number.isInteger(payload.year) || payload.year < 1900) {
    return res.status(400).json({ message: "year must be valid" });
  }

  if (!Number.isFinite(payload.ratePerDay) || payload.ratePerDay <= 0) {
    return res.status(400).json({ message: "ratePerDay must be greater than zero" });
  }

  if (!Number.isInteger(payload.seatCapacity) || payload.seatCapacity <= 0) {
    return res.status(400).json({ message: "seatCapacity must be a whole number greater than zero" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        "SELECT vehicle_id FROM vehicles WHERE plate_number = ? LIMIT 1",
        [payload.plateNumber]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "plate number already exists" });
      }

      const [vehicleResult] = await connection.query(
        `INSERT INTO vehicles (
           owner_id,
           model,
           brand,
           car_type,
           year,
           seat_capacity,
           plate_number,
           rate_per_day,
           features,
           status,
           created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
         [
           ownerId,
           payload.model,
           payload.brand,
           payload.carType,
           payload.year,
           payload.seatCapacity,
           payload.plateNumber,
          payload.ratePerDay.toFixed(2),
          payload.features || null,
          payload.status,
        ]
      );

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        await connection.query(
          `INSERT INTO vehicle_image (vehicle_id, image_url, is_primary, uploaded_at)
           VALUES (?, ?, ?, NOW())`,
          [vehicleResult.insertId, `/uploads/vehicles/${file.filename}`, index === 0 ? 1 : 0]
        );
      }

      await connection.commit();

      return res.status(201).json({ message: "vehicle created", vehicleId: vehicleResult.insertId });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Vehicle create error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.put("/:vehicleId", requireAuth, upload.array("images", 3), async (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const files = req.files || [];
  const payload = parseVehiclePayload(req.body);

  if (!vehicleId) {
    return res.status(400).json({ message: "vehicleId is required" });
  }

  if (!payload.brand || !payload.model || !payload.carType || !payload.year || !payload.seatCapacity || !payload.plateNumber || !payload.ratePerDay) {
    return res.status(400).json({ message: "brand, model, carType, year, seatCapacity, plateNumber and ratePerDay are required" });
  }

  if (!Number.isInteger(payload.year) || payload.year < 1900) {
    return res.status(400).json({ message: "year must be valid" });
  }

  if (!Number.isFinite(payload.ratePerDay) || payload.ratePerDay <= 0) {
    return res.status(400).json({ message: "ratePerDay must be greater than zero" });
  }

  if (!Number.isInteger(payload.seatCapacity) || payload.seatCapacity <= 0) {
    return res.status(400).json({ message: "seatCapacity must be a whole number greater than zero" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [vehicleRows] = await connection.query(
        "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND owner_id = ? LIMIT 1",
        [vehicleId, ownerId]
      );

      if (vehicleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "vehicle not found" });
      }

      const [duplicateRows] = await connection.query(
        "SELECT vehicle_id FROM vehicles WHERE plate_number = ? AND vehicle_id <> ? LIMIT 1",
        [payload.plateNumber, vehicleId]
      );

      if (duplicateRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "plate number already exists" });
      }

      await connection.query(
        `UPDATE vehicles
         SET brand = ?, model = ?, car_type = ?, year = ?, seat_capacity = ?, plate_number = ?, rate_per_day = ?, features = ?, status = ?
         WHERE vehicle_id = ? AND owner_id = ?`,
        [
          payload.brand,
          payload.model,
          payload.carType,
          payload.year,
          payload.seatCapacity,
          payload.plateNumber,
          payload.ratePerDay.toFixed(2),
          payload.features || null,
          payload.status,
          vehicleId,
          ownerId,
        ]
      );

      if (files.length > 0) {
        const [oldImages] = await connection.query(
          "SELECT image_id, image_url FROM vehicle_image WHERE vehicle_id = ?",
          [vehicleId]
        );

        await connection.query("DELETE FROM vehicle_image WHERE vehicle_id = ?", [vehicleId]);
        await deleteImageFiles(oldImages);

        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          await connection.query(
            `INSERT INTO vehicle_image (vehicle_id, image_url, is_primary, uploaded_at)
             VALUES (?, ?, ?, NOW())`,
            [vehicleId, `/uploads/vehicles/${file.filename}`, index === 0 ? 1 : 0]
          );
        }
      }

      await connection.commit();

      return res.json({ message: "vehicle updated", vehicleId });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Vehicle update error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

router.patch("/:vehicleId/reviews/:reviewId/respond", requireAuth, async (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const reviewId = Number(req.params.reviewId);
  const ownerResponse = String(req.body?.ownerResponse || "").trim();

  if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ message: "valid vehicle and review ids are required" });
  }

  if (!ownerResponse) {
    return res.status(400).json({ message: "owner response is required" });
  }

  try {
    await initDatabase();
    const pool = getPool();
    const ownerId = await getOwnerIdByUserId(pool, req.auth.sub);

    if (!ownerId) {
      return res.status(403).json({ message: "owner profile not found" });
    }

    const [rows] = await pool.query(
      `SELECT review_id
             , owner_response
       FROM reviews
       WHERE review_id = ? AND vehicle_id = ? AND owner_id = ?
       LIMIT 1`,
      [reviewId, vehicleId, ownerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "review not found" });
    }

    if (String(rows[0].owner_response || "").trim()) {
      return res.status(409).json({ message: "owner response has already been submitted" });
    }

    await pool.query(
      "UPDATE reviews SET owner_response = ?, owner_responded_at = NOW() WHERE review_id = ?",
      [ownerResponse, reviewId]
    );

    return res.json({
      message: "owner response saved",
      review: {
        reviewId,
        vehicleId,
        ownerResponse,
      },
    });
  } catch (error) {
    console.error("Owner review response error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ message: "database unavailable" });
    }
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
