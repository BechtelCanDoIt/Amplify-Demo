-- Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).

-- WSO2 LLC. licenses this file to you under the Apache License,
-- Version 2.0 (the "License"); you may not use this file except
-- in compliance with the License.
-- You may obtain a copy of the License at

-- http://www.apache.org/licenses/LICENSE-2.0

-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License. 

CREATE TABLE `visit` (
  `visit_id` int NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `visitor_id_hash` varchar(255) NOT NULL,
  `pass_number` varchar(50) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `whom_they_meet` varchar(255) DEFAULT NULL,
  `purpose_of_visit` text,
  `accessible_locations` json DEFAULT NULL,
  `visit_date` char(10) NOT NULL,
  `time_of_entry` datetime DEFAULT NULL,
  `time_of_departure` datetime DEFAULT NULL,
  `invitation_id` int DEFAULT NULL,
  `rejection_reason` varchar(45) DEFAULT NULL,
  `actioned_by` varchar(45) DEFAULT NULL,
  `invited_by` varchar(45) NOT NULL,
  `sms_verification_code` int DEFAULT NULL,
  `status` enum('REQUESTED','APPROVED','REJECTED','COMPLETED') NOT NULL,
  `created_by` varchar(60) NOT NULL,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` varchar(60) NOT NULL,
  `updated_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`visit_id`),
  UNIQUE KEY `uuid_UNIQUE` (`uuid`),
  UNIQUE KEY `sms_verification_code_UNIQUE` (`sms_verification_code`),
  KEY `fk_invitation_id_idx` (`invitation_id`),
  KEY `id_hash_idx` (`visitor_id_hash`),
  CONSTRAINT `visitor_id_hash` FOREIGN KEY (`visitor_id_hash`) REFERENCES `visitor` (`id_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `visitor` (
  `id_hash` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_on` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_on` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_hash`),
  UNIQUE KEY `id_hash_UNIQUE` (`id_hash`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

