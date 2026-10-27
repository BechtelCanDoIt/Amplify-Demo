-- Add unique index to prevent reusing the same blockchain transaction hash.
ALTER TABLE `parking_reservation`
    ADD UNIQUE KEY `uk_parking_reservation_tx_hash` (`transaction_hash`);

