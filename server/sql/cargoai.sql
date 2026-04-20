-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 19, 2026 at 10:14 PM
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
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `announcement_id` bigint(20) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `type` enum('promo','announcement','policy','maintenance') NOT NULL DEFAULT 'announcement',
  `target_role` enum('all','renter','owner','admin') NOT NULL DEFAULT 'all',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `audit_log_id` bigint(20) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `target_table` varchar(100) DEFAULT NULL,
  `target_id` bigint(20) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`audit_log_id`, `user_id`, `action_type`, `target_table`, `target_id`, `details`, `created_at`) VALUES
(1, 3, 'owner_approved', 'car_owners', 2, NULL, '2026-04-18 07:18:14'),
(2, 3, 'owner_approved', 'car_owners', 2, NULL, '2026-04-18 07:18:16'),
(3, 3, 'owner_approved', 'car_owners', 2, NULL, '2026-04-18 07:18:17'),
(4, 3, 'owner_approved', 'car_owners', 1, NULL, '2026-04-18 09:06:43'),
(5, 3, 'owner_suspended', 'car_owners', 2, NULL, '2026-04-18 09:18:16'),
(6, 3, 'owner_reactivated', 'car_owners', 2, NULL, '2026-04-18 09:18:18'),
(7, 3, 'owner_suspended', 'car_owners', 2, NULL, '2026-04-18 11:40:32'),
(8, 3, 'owner_reactivated', 'car_owners', 2, NULL, '2026-04-18 11:40:32'),
(9, 3, 'owner_suspended', 'car_owners', 2, NULL, '2026-04-18 11:41:00'),
(10, 3, 'owner_reactivated', 'car_owners', 2, NULL, '2026-04-18 11:41:01'),
(11, 3, 'owner_suspended', 'car_owners', 2, NULL, '2026-04-18 11:53:44'),
(12, 3, 'owner_reactivated', 'car_owners', 2, NULL, '2026-04-18 11:53:44'),
(13, 2, 'owner_subscription_requested', 'car_owners', 1, 'starter:monthly', '2026-04-20 03:32:11'),
(14, 3, 'subscription_pending', 'car_owners', 1, 'tier:starter;durationDays:30', '2026-04-20 03:32:57');

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

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `renter_id`, `vehicle_id`, `driver_id`, `start_date`, `end_date`, `pickup_location`, `dropoff_location`, `total_cost`, `status`, `created_at`) VALUES
(1, 1, 2, NULL, '2026-04-16 00:00:00', '2026-04-18 23:59:59', 'university of cebu', 'university of cebu', 4500.00, 'completed', '2026-04-16 09:08:24'),
(2, 1, 1, NULL, '2026-04-17 00:00:00', '2026-04-18 23:59:59', 'colon oreinte', 'colon oreinte', 2400.00, 'completed', '2026-04-16 10:55:18'),
(3, 1, 2, NULL, '2026-04-30 00:00:00', '2026-04-30 23:59:59', 'ucmn', 'ucmn', 1500.00, 'confirmed', '2026-04-16 11:45:38'),
(4, 1, 3, NULL, '2026-04-16 00:00:00', '2026-04-16 23:59:59', 'guadalupe', 'guadalupe', 1500.00, 'completed', '2026-04-16 11:54:25'),
(5, 1, 3, NULL, '2026-04-30 00:00:00', '2026-04-30 23:59:59', 'ucb', 'ucb', 1500.00, 'confirmed', '2026-04-17 06:33:44'),
(6, 1, 3, NULL, '2026-04-24 00:00:00', '2026-04-24 23:59:59', 'colon', 'colon', 1500.00, 'confirmed', '2026-04-17 07:25:05'),
(7, 1, 3, NULL, '2026-04-20 00:00:00', '2026-04-20 23:59:59', 'pardo', 'pardo', 1500.00, 'confirmed', '2026-04-17 07:48:10'),
(8, 1, 3, NULL, '2026-04-18 00:00:00', '2026-04-19 23:59:59', 'preferably your location', 'preferably your location', 3000.00, 'completed', '2026-04-18 06:59:05'),
(9, 1, 3, NULL, '2026-05-01 00:00:00', '2026-06-01 23:59:59', 'ucmn', 'ucmn', 48000.00, 'cancelled', '2026-04-18 11:46:21');

-- --------------------------------------------------------

--
-- Table structure for table `booking_status_logs`
--

CREATE TABLE `booking_status_logs` (
  `booking_status_log_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `previous_status` enum('pending','confirmed','ongoing','completed','cancelled') DEFAULT NULL,
  `new_status` enum('pending','confirmed','ongoing','completed','cancelled') NOT NULL,
  `changed_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking_status_logs`
--

INSERT INTO `booking_status_logs` (`booking_status_log_id`, `booking_id`, `previous_status`, `new_status`, `changed_by_user_id`, `notes`, `created_at`) VALUES
(1, 5, NULL, 'pending', 1, 'Booking created by renter', '2026-04-17 06:33:44'),
(2, 5, 'pending', 'confirmed', 4, 'Owner marked booking as confirmed', '2026-04-17 06:33:57'),
(3, 6, NULL, 'pending', 1, 'Booking created by renter', '2026-04-17 07:25:05'),
(4, 6, 'pending', 'confirmed', 4, 'Owner marked booking as confirmed', '2026-04-17 07:25:26'),
(5, 7, NULL, 'pending', 1, 'Booking created by renter', '2026-04-17 07:48:10'),
(6, 7, 'pending', 'confirmed', 4, 'Owner marked booking as confirmed', '2026-04-17 07:48:24'),
(7, 8, NULL, 'pending', 1, 'Booking created by renter', '2026-04-18 06:59:05'),
(8, 8, 'pending', 'confirmed', 4, 'Owner marked booking as confirmed', '2026-04-18 07:39:59'),
(9, 4, 'confirmed', 'completed', NULL, 'Booking automatically marked as completed after end date', '2026-04-18 08:19:38'),
(10, 9, NULL, 'pending', 1, 'Booking created by renter', '2026-04-18 11:46:21'),
(11, 9, 'pending', 'confirmed', 4, 'Owner marked booking as confirmed', '2026-04-18 11:46:38'),
(12, 1, 'confirmed', 'completed', NULL, 'Booking automatically marked as completed after end date', '2026-04-20 03:17:19'),
(13, 2, 'confirmed', 'completed', NULL, 'Booking automatically marked as completed after end date', '2026-04-20 03:17:19'),
(14, 8, 'confirmed', 'completed', NULL, 'Booking automatically marked as completed after end date', '2026-04-20 03:17:19'),
(15, 9, 'confirmed', 'cancelled', 1, 'Cancelled by renter', '2026-04-20 04:03:23');

-- --------------------------------------------------------

--
-- Table structure for table `car_owners`
--

CREATE TABLE `car_owners` (
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `account_status` enum('pending','active','suspended','rejected') NOT NULL DEFAULT 'pending',
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

INSERT INTO `car_owners` (`owner_id`, `user_id`, `created_at`, `account_status`, `subscription_status`, `subscription_tier`, `company_name`, `date_approved`, `subscription_start_date`, `subscription_end_date`) VALUES
(1, 2, '2026-04-14 20:25:33', 'active', 'pending', 'starter', NULL, '2026-04-18 09:06:43', NULL, NULL),
(2, 4, '2026-04-16 03:50:44', 'active', 'inactive', NULL, NULL, '2026-04-18 07:18:14', NULL, NULL);

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
-- Table structure for table `chatbot_feedback`
--

CREATE TABLE `chatbot_feedback` (
  `chatbot_feedback_id` bigint(20) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `booking_id` bigint(20) DEFAULT NULL,
  `rating` tinyint(3) UNSIGNED DEFAULT NULL,
  `feedback_text` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `complaints`
--

CREATE TABLE `complaints` (
  `complaint_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) DEFAULT NULL,
  `complainant_user_id` bigint(20) UNSIGNED NOT NULL,
  `against_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subject` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `status` enum('open','in_review','resolved','dismissed') NOT NULL DEFAULT 'open',
  `resolution_notes` text DEFAULT NULL,
  `resolved_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contracts`
--

CREATE TABLE `contracts` (
  `contract_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `renter_id` bigint(20) UNSIGNED NOT NULL,
  `contract_number` varchar(50) NOT NULL,
  `status` enum('draft','prepared','released','signed','completed','cancelled') NOT NULL DEFAULT 'draft',
  `terms_and_conditions` text DEFAULT NULL,
  `pickup_checklist` text DEFAULT NULL,
  `return_checklist` text DEFAULT NULL,
  `security_deposit` decimal(10,2) DEFAULT 0.00,
  `released_at` datetime DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `renter_agreed_at` datetime DEFAULT NULL,
  `renter_agreement_name` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contracts`
--

INSERT INTO `contracts` (`contract_id`, `booking_id`, `owner_id`, `renter_id`, `contract_number`, `status`, `terms_and_conditions`, `pickup_checklist`, `return_checklist`, `security_deposit`, `released_at`, `signed_at`, `completed_at`, `created_by_user_id`, `renter_agreed_at`, `renter_agreement_name`, `created_at`, `updated_at`) VALUES
(1, 4, 2, 1, 'CT-4-1776378736790', 'released', '**TERMS AND CONDITIONS**\n\n1. **Eligibility**\n   The renter must be at least 18 years old and possess a valid driver’s license. The renter must be physically and legally fit to operate the vehicle.\n\n2. **Authorized Drivers**\n   Only the renter and any approved drivers listed in the agreement are allowed to operate the vehicle.\n\n3. **Use of Vehicle**\n   The renter agrees to use the vehicle responsibly and only for lawful purposes. The vehicle must not be used for racing, illegal activities, towing (unless permitted), or transporting prohibited items.\n\n4. **Rental Period**\n   The vehicle must be returned on or before the agreed date and time. Late returns may incur additional charges.\n\n5. **Payment Terms**\n   All rental fees must be paid as agreed. Any additional charges (e.g., late fees, damages, fuel shortage) will be billed to the renter.\n\n6. **Security Deposit**\n   A refundable security deposit may be required. Deductions may be made for damages, penalties, or unpaid fees.\n\n7. **Fuel Policy**\n   The vehicle must be returned with the same fuel level as provided at pickup. Additional charges apply for fuel discrepancies.\n\n8. **Vehicle Condition**\n   The renter acknowledges that the vehicle is received in good condition. Any damage or issue must be reported immediately upon pickup.\n\n9. **Damage and Liability**\n   The renter is responsible for any loss or damage to the vehicle during the rental period, unless otherwise covered by insurance. All accidents must be reported immediately.\n\n10. **Traffic Violations**\n    The renter is responsible for all traffic violations, fines, and penalties incurred during the rental period.\n\n11. **Breakdown and Repairs**\n    In case of mechanical failure, the renter must notify the owner immediately. Unauthorized repairs are not allowed without approval.\n\n12. **Insurance**\n    If insurance is provided, coverage is subject to the terms of the policy. Any excess or non-covered damages will be the renter’s responsibility.\n\n13. **Cancellation Policy**\n    Cancellations may be subject to fees depending on timing and agreement.\n\n14. **Termination**\n    The owner reserves the right to terminate the rental agreement if any terms are violated.\n\n15. **Governing Law**\n    This agreement shall be governed by the laws of the Republic of the Philippines.\n\n16. **Acceptance of Terms**\n    By renting the vehicle, the renter agrees to all the terms and conditions stated above.', NULL, NULL, 0.00, '2026-04-17 06:32:20', NULL, '2026-04-17 06:32:21', 4, NULL, NULL, '2026-04-17 06:32:16', '2026-04-17 06:33:54'),
(2, 6, 2, 1, 'CTR-20260417-6', 'completed', 'CarGoAI Rental Agreement\n\n1. The renter agrees to use the vehicle only for lawful purposes.\n2. The renter is responsible for traffic violations, fuel usage, and avoidable damages during the booking period.\n3. The vehicle must be returned on the agreed date, time, and location.\n4. Extra charges may apply for late returns, major cleaning, damages, or violations of owner policies.\n5. Payment confirmation and owner approval may be required before final release of the vehicle.\n6. By agreeing, the renter confirms that the submitted booking details are accurate and accepts the rental terms.', NULL, NULL, 0.00, '2026-04-18 07:45:50', NULL, '2026-04-18 08:55:37', 1, '2026-04-17 07:25:05', 'Cristian Torrejos', '2026-04-17 07:25:05', '2026-04-18 08:55:37'),
(3, 7, 2, 1, 'CTR-20260417-7', 'completed', 'TERMS AND CONDITIONS\n\n1. Renter Responsibility\n   The renter is fully responsible for the vehicle from pickup until return, including any damage, loss, or theft.\n\n2. Authorized Driver Only\n   Only the renter (and approved drivers) are allowed to drive the vehicle.\n\n3. Rental Period & Late Fees\n   The vehicle must be returned on time. Late returns will be charged based on the daily rate or a penalty fee.\n\n4. Damage & Liability\n   Any damage caused during the rental period will be charged to the renter unless covered by insurance.\n\n5. Payment Obligation\n   The renter agrees to pay all rental fees and any additional charges (damages, fuel, penalties).\n\n6. Fuel Policy\n   The vehicle must be returned with the same fuel level. Shortage will be charged.\n\n7. Traffic Violations\n   All tickets, fines, and violations during the rental period are the renter’s responsibility.\n\n8. Proper Use of Vehicle\n   The vehicle must not be used for illegal activities, racing, or unauthorized purposes.\n\n9. Accident Reporting\n   Any accident or issue must be reported immediately to the owner.\n\n10. Agreement Confirmation\n    By booking and proceeding, the renter agrees to all terms and conditions.', NULL, NULL, 0.00, '2026-04-18 07:45:50', NULL, '2026-04-18 08:55:37', 1, '2026-04-17 07:48:10', 'cristian torrejos', '2026-04-17 07:48:10', '2026-04-18 08:55:37'),
(4, 8, 2, 1, 'CTR-20260418-8', 'completed', 'TERMS AND CONDITIONS\n\n1. Renter Responsibility\n   The renter is fully responsible for the vehicle from pickup until return, including any damage, loss, or theft.\n\n2. Authorized Driver Only\n   Only the renter (and approved drivers) are allowed to drive the vehicle.\n\n3. Rental Period & Late Fees\n   The vehicle must be returned on time. Late returns will be charged based on the daily rate or a penalty fee.\n\n4. Damage & Liability\n   Any damage caused during the rental period will be charged to the renter unless covered by insurance.\n\n5. Payment Obligation\n   The renter agrees to pay all rental fees and any additional charges (damages, fuel, penalties).\n\n6. Fuel Policy\n   The vehicle must be returned with the same fuel level. Shortage will be charged.\n\n7. Traffic Violations\n   All tickets, fines, and violations during the rental period are the renter’s responsibility.\n\n8. Proper Use of Vehicle\n   The vehicle must not be used for illegal activities, racing, or unauthorized purposes.\n\n9. Accident Reporting\n   Any accident or issue must be reported immediately to the owner.\n\n10. Agreement Confirmation\n    By booking and proceeding, the renter agrees to all terms and conditions.', NULL, NULL, 0.00, '2026-04-18 08:48:06', NULL, '2026-04-18 08:55:38', 1, '2026-04-18 06:59:05', 'cristian torrejos', '2026-04-18 06:59:05', '2026-04-18 08:55:38'),
(5, 9, 2, 1, 'CTR-20260418-9', 'prepared', 'TERMS AND CONDITIONS\n\n1. Renter Responsibility\n   The renter is fully responsible for the vehicle from pickup until return, including any damage, loss, or theft.\n\n2. Authorized Driver Only\n   Only the renter (and approved drivers) are allowed to drive the vehicle.\n\n3. Rental Period & Late Fees\n   The vehicle must be returned on time. Late returns will be charged based on the daily rate or a penalty fee.\n\n4. Damage & Liability\n   Any damage caused during the rental period will be charged to the renter unless covered by insurance.\n\n5. Payment Obligation\n   The renter agrees to pay all rental fees and any additional charges (damages, fuel, penalties).\n\n6. Fuel Policy\n   The vehicle must be returned with the same fuel level. Shortage will be charged.\n\n7. Traffic Violations\n   All tickets, fines, and violations during the rental period are the renter’s responsibility.\n\n8. Proper Use of Vehicle\n   The vehicle must not be used for illegal activities, racing, or unauthorized purposes.\n\n9. Accident Reporting\n   Any accident or issue must be reported immediately to the owner.\n\n10. Agreement Confirmation\n    By booking and proceeding, the renter agrees to all terms and conditions.', NULL, NULL, 0.00, NULL, NULL, NULL, 1, '2026-04-18 11:46:21', 'cristian torrejos', '2026-04-18 11:46:21', '2026-04-18 11:46:21');

-- --------------------------------------------------------

--
-- Table structure for table `contract_files`
--

CREATE TABLE `contract_files` (
  `contract_file_id` bigint(20) NOT NULL,
  `contract_id` bigint(20) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `file_type` enum('draft','signed','attachment') NOT NULL DEFAULT 'attachment',
  `uploaded_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `invoice_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `issued_at` datetime DEFAULT current_timestamp(),
  `status` enum('unpaid','paid','cancelled') DEFAULT 'unpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` bigint(20) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('booking_confirmation','booking_cancellation','payment_receipt','promo','announcement','system') NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `related_table` varchar(100) DEFAULT NULL,
  `related_id` bigint(20) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `type`, `title`, `message`, `related_table`, `related_id`, `is_read`, `created_at`, `read_at`) VALUES
(1, 4, 'system', 'Rental contract prepared', 'Your rental contract is ready for review.', 'contracts', 1, 0, '2026-04-17 06:32:16', NULL),
(2, 4, 'booking_confirmation', 'New booking request', 'A new renter booking requires your review.', 'bookings', 5, 0, '2026-04-17 06:33:44', NULL),
(3, 1, 'booking_confirmation', 'Booking confirmed', 'Your booking has been confirmed by the owner.', 'bookings', 5, 1, '2026-04-17 06:33:57', '2026-04-17 07:52:21'),
(4, 1, 'payment_receipt', 'Payment received', 'The owner has marked your booking payment as paid.', 'payments', 5, 1, '2026-04-17 06:34:22', '2026-04-17 07:52:19'),
(5, 4, 'booking_confirmation', 'New booking request', 'A new renter booking with an agreed contract requires your review.', 'bookings', 6, 0, '2026-04-17 07:25:05', NULL),
(6, 1, 'booking_confirmation', 'Booking confirmed', 'Your booking has been confirmed by the owner.', 'bookings', 6, 1, '2026-04-17 07:25:26', '2026-04-17 07:52:19'),
(7, 1, 'payment_receipt', 'Payment received', 'The owner has marked your booking payment as paid.', 'payments', 6, 1, '2026-04-17 07:25:52', '2026-04-17 07:52:18'),
(8, 4, 'booking_confirmation', 'New booking request', 'A new renter booking with an agreed contract requires your review.', 'bookings', 7, 0, '2026-04-17 07:48:10', NULL),
(9, 1, 'booking_confirmation', 'Booking confirmed', 'Your booking has been confirmed by the owner.', 'bookings', 7, 1, '2026-04-17 07:48:24', '2026-04-17 07:52:17'),
(10, 1, 'payment_receipt', 'Payment received', 'The owner has marked your booking payment as paid.', 'payments', 7, 1, '2026-04-17 07:48:28', '2026-04-17 07:52:16'),
(11, 4, 'booking_confirmation', 'New booking request', 'A new renter booking with an agreed contract requires your review.', 'bookings', 8, 0, '2026-04-18 06:59:05', NULL),
(12, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 07:18:14', NULL),
(13, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 07:18:16', NULL),
(14, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 07:18:17', NULL),
(15, 1, 'booking_confirmation', 'Booking confirmed', 'Your booking has been confirmed by the owner.', 'bookings', 8, 0, '2026-04-18 07:39:59', NULL),
(16, 1, 'payment_receipt', 'Payment received', 'The owner has marked your booking payment as paid.', 'payments', 8, 0, '2026-04-18 07:40:11', NULL),
(17, 2, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 1, 0, '2026-04-18 09:06:43', NULL),
(18, 4, 'system', 'Owner account review update', 'Your owner account status is now suspended.', 'car_owners', 2, 0, '2026-04-18 09:18:16', NULL),
(19, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 09:18:18', NULL),
(20, 4, 'system', 'Owner account review update', 'Your owner account status is now suspended.', 'car_owners', 2, 0, '2026-04-18 11:40:32', NULL),
(21, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 11:40:32', NULL),
(22, 4, 'system', 'Owner account review update', 'Your owner account status is now suspended.', 'car_owners', 2, 0, '2026-04-18 11:41:00', NULL),
(23, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 11:41:01', NULL),
(24, 4, 'booking_confirmation', 'New booking request', 'A new renter booking with an agreed contract requires your review.', 'bookings', 9, 0, '2026-04-18 11:46:21', NULL),
(25, 1, 'booking_confirmation', 'Booking confirmed', 'Your booking has been confirmed by the owner.', 'bookings', 9, 0, '2026-04-18 11:46:38', NULL),
(26, 4, 'system', 'Owner account review update', 'Your owner account status is now suspended.', 'car_owners', 2, 0, '2026-04-18 11:53:44', NULL),
(27, 4, 'system', 'Owner account review update', 'Your owner account status is now active.', 'car_owners', 2, 0, '2026-04-18 11:53:44', NULL),
(28, 2, 'system', 'Subscription request submitted', 'Your starter monthly subscription request is pending admin review.', 'car_owners', 1, 0, '2026-04-20 03:32:11', NULL),
(29, 2, 'system', 'Subscription status updated', 'Your subscription is now pending under the starter plan.', 'car_owners', 1, 0, '2026-04-20 03:32:57', NULL),
(30, 4, 'booking_cancellation', 'Booking cancelled', 'A renter has cancelled a booking assigned to your vehicle.', 'bookings', 9, 0, '2026-04-20 04:03:23', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `owner_approval_logs`
--

CREATE TABLE `owner_approval_logs` (
  `owner_approval_log_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `reviewed_by_user_id` bigint(20) UNSIGNED NOT NULL,
  `decision` enum('pending','approved','rejected','suspended','reactivated') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `owner_approval_logs`
--

INSERT INTO `owner_approval_logs` (`owner_approval_log_id`, `owner_id`, `reviewed_by_user_id`, `decision`, `notes`, `created_at`) VALUES
(1, 2, 3, 'approved', NULL, '2026-04-18 07:18:14'),
(2, 2, 3, 'approved', NULL, '2026-04-18 07:18:16'),
(3, 2, 3, 'approved', NULL, '2026-04-18 07:18:17'),
(4, 1, 3, 'approved', NULL, '2026-04-18 09:06:43'),
(5, 2, 3, 'suspended', NULL, '2026-04-18 09:18:16'),
(6, 2, 3, 'reactivated', NULL, '2026-04-18 09:18:18'),
(7, 2, 3, 'suspended', NULL, '2026-04-18 11:40:32'),
(8, 2, 3, 'reactivated', NULL, '2026-04-18 11:40:32'),
(9, 2, 3, 'suspended', NULL, '2026-04-18 11:41:00'),
(10, 2, 3, 'reactivated', NULL, '2026-04-18 11:41:01'),
(11, 2, 3, 'suspended', NULL, '2026-04-18 11:53:44'),
(12, 2, 3, 'reactivated', NULL, '2026-04-18 11:53:44');

-- --------------------------------------------------------

--
-- Table structure for table `owner_contract_templates`
--

CREATE TABLE `owner_contract_templates` (
  `owner_contract_template_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `template_title` varchar(150) NOT NULL DEFAULT 'Rental Agreement',
  `terms_and_conditions` text NOT NULL,
  `security_deposit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `updated_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `owner_contract_templates`
--

INSERT INTO `owner_contract_templates` (`owner_contract_template_id`, `owner_id`, `template_title`, `terms_and_conditions`, `security_deposit`, `updated_by_user_id`, `created_at`, `updated_at`) VALUES
(1, 2, 'Rental Agreement', 'TERMS AND CONDITIONS\n\n1. Renter Responsibility\n   The renter is fully responsible for the vehicle from pickup until return, including any damage, loss, or theft.\n\n2. Authorized Driver Only\n   Only the renter (and approved drivers) are allowed to drive the vehicle.\n\n3. Rental Period & Late Fees\n   The vehicle must be returned on time. Late returns will be charged based on the daily rate or a penalty fee.\n\n4. Damage & Liability\n   Any damage caused during the rental period will be charged to the renter unless covered by insurance.\n\n5. Payment Obligation\n   The renter agrees to pay all rental fees and any additional charges (damages, fuel, penalties).\n\n6. Fuel Policy\n   The vehicle must be returned with the same fuel level. Shortage will be charged.\n\n7. Traffic Violations\n   All tickets, fines, and violations during the rental period are the renter’s responsibility.\n\n8. Proper Use of Vehicle\n   The vehicle must not be used for illegal activities, racing, or unauthorized purposes.\n\n9. Accident Reporting\n   Any accident or issue must be reported immediately to the owner.\n\n10. Agreement Confirmation\n    By booking and proceeding, the renter agrees to all terms and conditions.', 0.00, 4, '2026-04-17 07:39:04', '2026-04-18 08:43:33'),
(2, 1, 'Rental Agreement', 'KEY TERMS AND CONDITIONS (ESSENTIAL CLAUSES)\n\n1. Renter Responsibility\n   The renter is fully responsible for the vehicle from pickup until return, including any damage, loss, or theft.\n\n2. Authorized Driver Only\n   Only the renter (and approved drivers) are allowed to drive the vehicle.\n\n3. Rental Period & Late Fees\n   The vehicle must be returned on time. Late returns will be charged based on the daily rate or a penalty fee.\n\n4. Damage & Liability\n   Any damage caused during the rental period will be charged to the renter unless covered by insurance.\n\n5.Payment Obligation\n   The renter agrees to pay all rental fees and any additional charges (damages, fuel, penalties).\n\n6. Fuel Policy\n   The vehicle must be returned with the same fuel level. Shortage will be charged.\n\n7. Traffic Violations\n   All tickets, fines, and violations during the rental period are the renter’s responsibility.\n\n8. Proper Use of Vehicle\n   The vehicle must not be used for illegal activities, racing, or unauthorized purposes.\n\n9. Accident Reporting\n   Any accident or issue must be reported immediately to the owner.\n\n10. Agreement Confirmation\n    By booking and proceeding, the renter agrees to all terms and conditions.', 0.00, 2, '2026-04-18 06:44:20', '2026-04-18 06:44:21');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `method` enum('cash','gcash','maya','card','bank_transfer') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `received_by_name` varchar(150) DEFAULT NULL,
  `received_by_user_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `booking_id`, `method`, `amount`, `status`, `paid_at`, `received_by_name`, `received_by_user_id`) VALUES
(1, 1, 'gcash', 4500.00, 'paid', '2026-04-16 09:25:36', 'System Seed', NULL),
(2, 2, 'cash', 2400.00, 'paid', '2026-04-16 10:55:53', 'System Seed', NULL),
(3, 3, 'cash', 1500.00, 'paid', '2026-04-16 11:47:17', 'System Seed', NULL),
(4, 4, 'gcash', 1500.00, 'paid', '2026-04-16 11:55:16', 'System Seed', NULL),
(5, 5, 'cash', 1500.00, 'paid', '2026-04-17 06:34:22', 'System Seed', NULL),
(6, 6, 'gcash', 1500.00, 'paid', '2026-04-17 07:25:52', 'System Seed', NULL),
(7, 7, 'gcash', 1500.00, 'paid', '2026-04-17 07:48:28', 'System Seed', NULL),
(8, 8, 'cash', 3000.00, 'paid', '2026-04-18 07:40:11', 'System Seed', NULL),
(9, 9, 'gcash', 48000.00, 'pending', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

CREATE TABLE `promotions` (
  `promotion_id` bigint(20) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount') NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `promo_code` varchar(50) DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `review_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `vehicle_id` bigint(20) NOT NULL,
  `renter_id` bigint(20) UNSIGNED NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `car_rating` tinyint(3) UNSIGNED DEFAULT NULL,
  `experience_rating` tinyint(3) UNSIGNED DEFAULT NULL,
  `review_text` text DEFAULT NULL,
  `owner_response` text DEFAULT NULL,
  `owner_responded_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`review_id`, `booking_id`, `vehicle_id`, `renter_id`, `owner_id`, `car_rating`, `experience_rating`, `review_text`, `owner_response`, `owner_responded_at`, `created_at`, `updated_at`) VALUES
(1, 4, 3, 1, 2, 4, 4, 'smooth and easy booking', 'thankyou for booking', '2026-04-18 08:38:36', '2026-04-18 08:22:04', '2026-04-18 08:38:36');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_id` bigint(20) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `value_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `description` varchar(255) DEFAULT NULL,
  `updated_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email_verification_token` varchar(128) DEFAULT NULL,
  `email_verification_expires_at` datetime DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `password_reset_token` varchar(128) DEFAULT NULL,
  `password_reset_expires_at` datetime DEFAULT NULL,
  `account_status` enum('pending','active','suspended','disabled') NOT NULL DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `username`, `email`, `password_hash`, `role`, `is_email_verified`, `email_verification_token`, `email_verification_expires_at`, `email_verified_at`, `password_reset_token`, `password_reset_expires_at`, `account_status`, `last_login_at`, `created_at`) VALUES
(1, 'cristiantorrejos', 'cristiantorrejos03@gmail.com', '$2b$10$qhTSMHDCqxP9aQmye7v/GuyhWq.NtIcekrkxUNJ3dj1kTewsLi1IO', 'renter', 1, NULL, NULL, '2026-04-17 03:56:19', NULL, NULL, 'active', NULL, '2026-04-14 19:50:16'),
(2, 'owner1', 'kritozen@gmail.com', '$2b$10$qkrRaqG9MIIvHf2GvexeAe9vWIGbBfko56MbYiJvypIPzpPGkATPK', 'owner', 1, NULL, NULL, '2026-04-17 03:56:19', NULL, NULL, 'active', NULL, '2026-04-14 20:25:33'),
(3, 'sadmin123', 'torrejosc69@gmail.com', '$2b$10$Pngzhd65pzYGfr6QRtqST.ftCYYgN37V1rDSRXi/ajKb8qE/hrzuO', 'admin', 1, NULL, NULL, '2026-04-15 04:27:36', NULL, NULL, 'active', NULL, '2026-04-14 20:27:36'),
(4, 'owner2', 'manoy9080@gmail.com', '$2b$10$9h8yCQiSTbxOjgs3oRjNBe54iVR4jWn5zd/GHyu0Xgsd04wNAHFey', 'owner', 1, NULL, NULL, '2026-04-17 03:52:23', NULL, NULL, 'active', NULL, '2026-04-16 03:50:44');

-- --------------------------------------------------------

--
-- Table structure for table `user_status_logs`
--

CREATE TABLE `user_status_logs` (
  `user_status_log_id` bigint(20) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `previous_status` enum('pending','active','suspended','disabled') DEFAULT NULL,
  `new_status` enum('pending','active','suspended','disabled') NOT NULL,
  `changed_by_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_status_logs`
--

INSERT INTO `user_status_logs` (`user_status_log_id`, `user_id`, `previous_status`, `new_status`, `changed_by_user_id`, `notes`, `created_at`) VALUES
(1, 4, 'pending', 'active', 3, NULL, '2026-04-18 07:18:14'),
(2, 4, 'active', 'active', 3, NULL, '2026-04-18 07:18:16'),
(3, 4, 'active', 'active', 3, NULL, '2026-04-18 07:18:17'),
(4, 2, 'pending', 'active', 3, NULL, '2026-04-18 09:06:43'),
(5, 4, 'active', 'suspended', 3, NULL, '2026-04-18 09:18:16'),
(6, 4, 'suspended', 'active', 3, NULL, '2026-04-18 09:18:18'),
(7, 4, 'active', 'suspended', 3, NULL, '2026-04-18 11:40:32'),
(8, 4, 'suspended', 'active', 3, NULL, '2026-04-18 11:40:32'),
(9, 4, 'active', 'suspended', 3, NULL, '2026-04-18 11:41:00'),
(10, 4, 'suspended', 'active', 3, NULL, '2026-04-18 11:41:01'),
(11, 4, 'active', 'suspended', 3, NULL, '2026-04-18 11:53:44'),
(12, 4, 'suspended', 'active', 3, NULL, '2026-04-18 11:53:44');

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

CREATE TABLE `vehicles` (
  `vehicle_id` bigint(20) NOT NULL,
  `owner_id` bigint(20) UNSIGNED NOT NULL,
  `model` varchar(100) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `car_type` varchar(50) NOT NULL DEFAULT 'Sedan',
  `year` year(4) NOT NULL,
  `seat_capacity` tinyint(3) UNSIGNED NOT NULL,
  `plate_number` varchar(50) NOT NULL,
  `rate_per_day` decimal(10,2) NOT NULL,
  `features` text DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `status` enum('available','booked','maintenance','inactive') DEFAULT 'available',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicles`
--

INSERT INTO `vehicles` (`vehicle_id`, `owner_id`, `model`, `brand`, `car_type`, `year`, `seat_capacity`, `plate_number`, `rate_per_day`, `features`, `approval_status`, `status`, `created_at`) VALUES
(1, 1, 'Rush G', 'toyota', 'SUV\n', '2021', 7, 'abc-132', 1200.00, 'Automatic / Manual transmission\r\nAir conditioning\r\n7-seater (family size)\r\nBluetooth / audio system\r\nUSB charging port\r\nBackup camera / parking sensors\r\nPower windows & locks\r\nKeyless entry\r\nHigh ground clearance\r\nFuel-efficient', 'pending', 'available', '2026-04-15 06:33:32'),
(2, 1, 'Camry', 'Toyota', 'Sedan', '2024', 5, 'cda-263', 1500.00, 'Automatic transmission\r\nAir conditioning\r\n5-seater (spacious interior)\r\nBluetooth / audio system\r\nUSB charging port\r\nBackup camera / parking sensors\r\nPower windows & locks\r\nKeyless entry / push start\r\nFuel-efficient\r\nComfortable for long drives', 'pending', 'available', '2026-04-16 07:54:04'),
(3, 2, 'Montero', 'Mitsubishi', 'SUV', '2025', 7, 'uyt-896', 1500.00, 'Automatic transmission\r\nAir conditioning\r\n7-seater (spacious SUV)\r\nBluetooth / audio system\r\nUSB charging port\r\nBackup camera / parking sensors\r\nPower windows & locks\r\nKeyless entry / push start\r\nHigh ground clearance\r\nFuel-efficient (diesel)', 'pending', 'available', '2026-04-16 11:52:55');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_approval_logs`
--

CREATE TABLE `vehicle_approval_logs` (
  `vehicle_approval_log_id` bigint(20) NOT NULL,
  `vehicle_id` bigint(20) NOT NULL,
  `reviewed_by_user_id` bigint(20) UNSIGNED NOT NULL,
  `decision` enum('pending','approved','rejected','suspended','reactivated') NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(4, 2, '/uploads/vehicles/1776297244776-camry3.jpg', 0, '2026-04-16 07:54:04'),
(5, 3, '/uploads/vehicles/1776311575529-montero.jpg', 1, '2026-04-16 11:52:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`announcement_id`),
  ADD KEY `created_by_user_id` (`created_by_user_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`audit_log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `renter_id` (`renter_id`),
  ADD KEY `vehicle_id` (`vehicle_id`);

--
-- Indexes for table `booking_status_logs`
--
ALTER TABLE `booking_status_logs`
  ADD PRIMARY KEY (`booking_status_log_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `changed_by_user_id` (`changed_by_user_id`);

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
-- Indexes for table `chatbot_feedback`
--
ALTER TABLE `chatbot_feedback`
  ADD PRIMARY KEY (`chatbot_feedback_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `complaints`
--
ALTER TABLE `complaints`
  ADD PRIMARY KEY (`complaint_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `complainant_user_id` (`complainant_user_id`),
  ADD KEY `against_user_id` (`against_user_id`),
  ADD KEY `resolved_by_user_id` (`resolved_by_user_id`);

--
-- Indexes for table `contracts`
--
ALTER TABLE `contracts`
  ADD PRIMARY KEY (`contract_id`),
  ADD UNIQUE KEY `uq_contract_booking` (`booking_id`),
  ADD UNIQUE KEY `uq_contract_number` (`contract_number`),
  ADD KEY `owner_id` (`owner_id`),
  ADD KEY `renter_id` (`renter_id`),
  ADD KEY `created_by_user_id` (`created_by_user_id`);

--
-- Indexes for table `contract_files`
--
ALTER TABLE `contract_files`
  ADD PRIMARY KEY (`contract_file_id`),
  ADD KEY `contract_id` (`contract_id`),
  ADD KEY `uploaded_by_user_id` (`uploaded_by_user_id`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`invoice_id`),
  ADD UNIQUE KEY `uq_invoice_number` (`invoice_number`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `owner_approval_logs`
--
ALTER TABLE `owner_approval_logs`
  ADD PRIMARY KEY (`owner_approval_log_id`),
  ADD KEY `owner_id` (`owner_id`),
  ADD KEY `reviewed_by_user_id` (`reviewed_by_user_id`);

--
-- Indexes for table `owner_contract_templates`
--
ALTER TABLE `owner_contract_templates`
  ADD PRIMARY KEY (`owner_contract_template_id`),
  ADD UNIQUE KEY `uq_owner_contract_templates_owner` (`owner_id`),
  ADD KEY `updated_by_user_id` (`updated_by_user_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `received_by_user_id` (`received_by_user_id`);

--
-- Indexes for table `promotions`
--
ALTER TABLE `promotions`
  ADD PRIMARY KEY (`promotion_id`),
  ADD UNIQUE KEY `uq_promotions_promo_code` (`promo_code`),
  ADD KEY `created_by_user_id` (`created_by_user_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD UNIQUE KEY `uq_reviews_booking` (`booking_id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `renter_id` (`renter_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `uq_system_settings_key` (`setting_key`),
  ADD KEY `updated_by_user_id` (`updated_by_user_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_user_username` (`username`),
  ADD UNIQUE KEY `uq_user_email` (`email`),
  ADD UNIQUE KEY `uq_user_email_verification_token` (`email_verification_token`),
  ADD UNIQUE KEY `uq_user_password_reset_token` (`password_reset_token`);

--
-- Indexes for table `user_status_logs`
--
ALTER TABLE `user_status_logs`
  ADD PRIMARY KEY (`user_status_log_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `changed_by_user_id` (`changed_by_user_id`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`vehicle_id`),
  ADD UNIQUE KEY `plate_number` (`plate_number`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `vehicle_approval_logs`
--
ALTER TABLE `vehicle_approval_logs`
  ADD PRIMARY KEY (`vehicle_approval_log_id`),
  ADD KEY `vehicle_id` (`vehicle_id`),
  ADD KEY `reviewed_by_user_id` (`reviewed_by_user_id`);

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
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `announcement_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `audit_log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `booking_status_logs`
--
ALTER TABLE `booking_status_logs`
  MODIFY `booking_status_log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `car_owners`
--
ALTER TABLE `car_owners`
  MODIFY `owner_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `car_renter`
--
ALTER TABLE `car_renter`
  MODIFY `renter_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `chatbot_feedback`
--
ALTER TABLE `chatbot_feedback`
  MODIFY `chatbot_feedback_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `complaints`
--
ALTER TABLE `complaints`
  MODIFY `complaint_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contracts`
--
ALTER TABLE `contracts`
  MODIFY `contract_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `contract_files`
--
ALTER TABLE `contract_files`
  MODIFY `contract_file_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice`
--
ALTER TABLE `invoice`
  MODIFY `invoice_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `owner_approval_logs`
--
ALTER TABLE `owner_approval_logs`
  MODIFY `owner_approval_log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `owner_contract_templates`
--
ALTER TABLE `owner_contract_templates`
  MODIFY `owner_contract_template_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `promotion_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `setting_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_status_logs`
--
ALTER TABLE `user_status_logs`
  MODIFY `user_status_log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `vehicle_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `vehicle_approval_logs`
--
ALTER TABLE `vehicle_approval_logs`
  MODIFY `vehicle_approval_log_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicle_blockouts`
--
ALTER TABLE `vehicle_blockouts`
  MODIFY `blockout_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicle_image`
--
ALTER TABLE `vehicle_image`
  MODIFY `image_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `fk_announcements_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_renter` FOREIGN KEY (`renter_id`) REFERENCES `car_renter` (`renter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `booking_status_logs`
--
ALTER TABLE `booking_status_logs`
  ADD CONSTRAINT `fk_booking_status_logs_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_status_logs_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
-- Constraints for table `chatbot_feedback`
--
ALTER TABLE `chatbot_feedback`
  ADD CONSTRAINT `fk_chatbot_feedback_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_chatbot_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `complaints`
--
ALTER TABLE `complaints`
  ADD CONSTRAINT `fk_complaints_against_user` FOREIGN KEY (`against_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_complainant_user` FOREIGN KEY (`complainant_user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_complaints_resolved_by_user` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `contracts`
--
ALTER TABLE `contracts`
  ADD CONSTRAINT `fk_contracts_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_contracts_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_contracts_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_contracts_renter` FOREIGN KEY (`renter_id`) REFERENCES `car_renter` (`renter_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `contract_files`
--
ALTER TABLE `contract_files`
  ADD CONSTRAINT `fk_contract_files_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`contract_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_contract_files_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `invoice`
--
ALTER TABLE `invoice`
  ADD CONSTRAINT `fk_invoice_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_invoice_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `owner_approval_logs`
--
ALTER TABLE `owner_approval_logs`
  ADD CONSTRAINT `fk_owner_approval_logs_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_owner_approval_logs_user` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `owner_contract_templates`
--
ALTER TABLE `owner_contract_templates`
  ADD CONSTRAINT `fk_owner_contract_templates_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_owner_contract_templates_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_payments_received_by_user` FOREIGN KEY (`received_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `promotions`
--
ALTER TABLE `promotions`
  ADD CONSTRAINT `fk_promotions_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_renter` FOREIGN KEY (`renter_id`) REFERENCES `car_renter` (`renter_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reviews_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_system_settings_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `user_status_logs`
--
ALTER TABLE `user_status_logs`
  ADD CONSTRAINT `fk_user_status_logs_changed_by` FOREIGN KEY (`changed_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_status_logs_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD CONSTRAINT `fk_vehicles_owner` FOREIGN KEY (`owner_id`) REFERENCES `car_owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vehicle_approval_logs`
--
ALTER TABLE `vehicle_approval_logs`
  ADD CONSTRAINT `fk_vehicle_approval_logs_user` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_vehicle_approval_logs_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
