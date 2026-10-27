CREATE TABLE `parking_floor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `display_order` int NOT NULL DEFAULT 0,
  `coins_per_slot` decimal(10, 4) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` varchar(100) NOT NULL,
  `updated_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `parking_slot` (
  `slot_id` varchar(10) NOT NULL,
  `floor_id` int NOT NULL,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` varchar(100) NOT NULL,
  `updated_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` varchar(100) NOT NULL,
  PRIMARY KEY (`slot_id`),
  CONSTRAINT `fk_ps_floor` FOREIGN KEY (`floor_id`) REFERENCES `parking_floor` (`id`) ON DELETE CASCADE
);

CREATE TABLE `parking_reservation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slot_id` varchar(10) NOT NULL,
  `booking_date` date NOT NULL,
  `employee_email` varchar(100) NOT NULL,
  `vehicle_id` int NOT NULL,
  `status` enum('PENDING','CONFIRMED') NOT NULL DEFAULT 'PENDING',
  `transaction_hash` varchar(255) DEFAULT NULL,
  `coins_amount` decimal(10, 4) NOT NULL,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` varchar(100) NOT NULL,
  `updated_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pr_slot` FOREIGN KEY (`slot_id`) REFERENCES `parking_slot` (`slot_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pr_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_slot_booking_date` (`slot_id`, `booking_date`)
);
