ALTER TABLE `parking_reservation`
    MODIFY COLUMN `status` ENUM ('PENDING', 'CONFIRMED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `parking_reservation`
    ADD INDEX `idx_pr_slot_booking_date` (`slot_id`, `booking_date`);

ALTER TABLE `parking_reservation`
    DROP INDEX `uk_slot_booking_date`;

CREATE UNIQUE INDEX `uk_active_slot_booking_date` ON `parking_reservation` ((
    CASE
        WHEN status IN ('PENDING', 'CONFIRMED')
            THEN CONCAT(slot_id, '|', booking_date)
        ELSE NULL
    END
));
