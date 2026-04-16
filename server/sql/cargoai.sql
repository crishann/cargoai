-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 16, 2026 at 03:00 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cargoai`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` bigint(20) NOT NULL,
  `renter_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_id` bigint(20) NOT NULL,
  `driver_id` bigint(20) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `pickup_location` varchar(255) NOT NULL,
  `dropoff_location` varchar(255) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','ongoing','completed','cancelled') DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `car_owners`
--

CREATE TABLE `car_owners` (
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `subscription_status` varchar(50) DEFAULT NULL,
  `subscription_tier` varchar(50) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `date_approved` datetime DEFAULT NULL,
  `subscription_start_date` datetime DEFAULT NULL,
  `subscription_end_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `car_owners`
--

INSERT INTO `car_owners` (`owner_id`, `user_id`, `created_at`, `subscription_status`, `subscription_tier`, `company_name`, `date_approved`, `subscription_start_date`, `subscription_end_date`) VALUES
(1, 2, '2026-04-14 20:25:33', 'inactive', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `car_renter`
--

CREATE TABLE `car_renter` (
  `renter_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `government_id` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `car_renter`
--

INSERT INTO `car_renter` (`renter_id`, `user_id`, `created_at`, `government_id`, `address`, `phone_number`) VALUES
(1, 1, '2026-04-14 19:50:16', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `invoice_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `issued_at` datetime DEFAULT current_timestamp(),
  `status` enum('unpaid','paid','cancelled') DEFAULT 'unpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `method` enum('cash','gcash','card','bank_transfer') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('renter','owner','admin') NOT NULL DEFAULT 'renter',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `username`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'cristiantorrejos', 'cristiantorrejos03@gmail.com', '$2b$10$G31Bs/xv24DVwWSUb2uu9uahBdq7zAzatWDmR9sewHNNGPsgSp69C', 'renter', '2026-04-14 19:50:16'),
(2, 'owner1', 'owner1@gmail.com', '$2b$10$qkrRaqG9MIIvHf2GvexeAe9vWIGbBfko56MbYiJvypIPzpPGkATPK', 'owner', '2026-04-14 20:25:33'),
(3, 'sadmin123', 'sadmin123@cargoai.local', '$2b$10$Pngzhd65pzYGfr6QRtqST.ftCYYgN37V1rDSRXi/ajKb8qE/hrzuO', 'admin', '2026-04-14 20:27:36');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `vehicle_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `model` varchar(100) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `year` year(4) NOT NULL,
  `plate_number` varchar(50) NOT NULL,
  `rate_per_day` decimal(10,2) NOT NULL,
  `features` text DEFAULT NULL,
  `status` enum('available','booked','maintenance','inactive') DEFAULT 'available',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`vehicle_id`, `owner_id`, `model`, `brand`, `year`, `plate_number`, `rate_per_day`, `features`, `status`, `created_at`) VALUES
(1, 1, 'Rush G', 'toyota', '2021', 'abc-132', 1200.00, 'Automatic / Manual transmission\r\nAir conditioning\r\n7-seater (family size)\r\nBluetooth / audio system\r\nUSB charging port\r\nBackup camera / parking sensors\r\nPower windows & locks\r\nKeyless entry\r\nHigh ground clearance\r\nFuel-efficient', 'available', '2026-04-15 06:33:32'),
(2, 1, 'Camry', 'Toyota', '2024', 'cda-263', 1500.00, 'Automatic transmission\r\nAir conditioning\r\n5-seater (spacious interior)\r\nBluetooth / audio system\r\nUSB charging port\r\nBackup camera / parking sensors\r\nPower windows & locks\r\nKeyless entry / push start\r\nFuel-efficient\r\nComfortable for long drives', 'available', '2026-04-16 07:54:04');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_blockouts`
--

CREATE TABLE `vehicle_blockouts` (
  `blockout_id` bigint(20) NOT NULL,
  `vehicle_id` bigint(20) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_image`
--

CREATE TABLE `vehicle_image` (
  `image_id` bigint(20) NOT NULL,
  `vehicle_id` bigint(20) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `uploaded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle_image`
--

INSERT INTO `vehicle_image` (`image_id`, `vehicle_id`, `image_url`, `is_primary`, `uploaded_at`) VALUES
(1, 1, '/uploads/vehicles/1776206012111-rush-g.jpg', 1, '2026-04-15 06:33:32'),
(2, 2, '/uploads/vehicles/1776297244767-camry.jpg', 1, '2026-04-16 07:54:04'),
(3, 2, '/uploads/vehicles/1776297244776-camry2.jpg', 0, '2026-04-16 07:54:04'),
(4, 2, '/uploads/vehicles/1776297244776-camry3.jpg', 0, '2026-04-16 07:54:04');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `renter_id` (`renter_id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- Indexes for table `car_owners`
--
ALTER TABLE `car_owners`
  ADD PRIMARY KEY (`owner_id`),
  ADD UNIQUE KEY `uq_car_owners_user_id` (`user_id`);

--
-- Indexes for table `car_renter`
--
ALTER TABLE `car_renter`
  ADD PRIMARY KEY (`renter_id`),
  ADD UNIQUE KEY `uq_car_renter_user_id` (`user_id`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`invoice_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_user_username` (`username`),
  ADD UNIQUE KEY `uq_user_email` (`email`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`vehicle_id`),
  ADD UNIQUE KEY `plate_number` (`plate_number`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `vehicle_blockouts`
--
ALTER TABLE `vehicle_blockouts`
  ADD PRIMARY KEY (`blockout_id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- Indexes for table `vehicle_image`
--
ALTER TABLE `vehicle_image`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `car_owners`
--
ALTER TABLE `car_owners`
  MODIFY `owner_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `car_renter`
--
ALTER TABLE `car_renter`
  MODIFY `renter_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `invoice`
--
ALTER TABLE `invoice`
  MODIFY `invoice_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `vehicle_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `vehicle_blockouts`
--
ALTER TABLE `vehicle_blockouts`
  MODIFY `blockout_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicle_image`
--
ALTER TABLE `vehicle_image`
  MODIFY `image_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_renter` FOREIGN KEY (`renter_id`) REFERENCES `car_renter` (`renter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `car_owners`
--
ALTER TABLE `car_owners`
  ADD CONSTRAINT `fk_car_owners_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `car_renter`
--
ALTER TABLE `car_renter`
  ADD CONSTRAINT `fk_car_renter_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invoice`
--
ALTER TABLE `invoice`
  ADD CONSTRAINT `fk_invoice_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoice_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicles_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicle_blockouts`
--
ALTER TABLE `vehicle_blockouts`
  ADD CONSTRAINT `fk_vehicle_blockouts_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicle_image`
--
ALTER TABLE `vehicle_image`
  ADD CONSTRAINT `fk_vehicle_image_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
