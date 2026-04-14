CREATE DATABASE IF NOT EXISTS cargoai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cargoai;

CREATE TABLE IF NOT EXISTS `user` (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('renter', 'owner', 'admin') NOT NULL DEFAULT 'renter',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_username (username),
  UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS car_renter (
  renter_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  government_id VARCHAR(255) NULL,
  address TEXT NULL,
  phone_number VARCHAR(50) NULL,
  PRIMARY KEY (renter_id),
  UNIQUE KEY uq_car_renter_user_id (user_id),
  CONSTRAINT fk_car_renter_user
    FOREIGN KEY (user_id) REFERENCES `user`(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS car_owners (
  owner_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subscription_status VARCHAR(50) NULL,
  subscription_tier VARCHAR(50) NULL,
  company_name VARCHAR(255) NULL,
  date_approved DATE NULL,
  subscription_start_date DATE NULL,
  subscription_end_date DATE NULL,
  PRIMARY KEY (owner_id),
  UNIQUE KEY uq_car_owners_user_id (user_id),
  CONSTRAINT fk_car_owners_user
    FOREIGN KEY (user_id) REFERENCES `user`(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
