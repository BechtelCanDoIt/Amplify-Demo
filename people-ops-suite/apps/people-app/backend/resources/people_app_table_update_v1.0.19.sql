-- Backfill the company.prefix (country code) for all existing companies.
-- Employee IDs are generated as `<company.prefix><number>`, so a blank prefix
-- produces a malformed, code-less ID. Each code below is the leading alphabetic
-- prefix already embedded in that company's existing PERMANENT/INTERNSHIP
-- employee IDs (the types that carry the company prefix); the dominant code per
-- company was used. Companies with no employees to derive from (Malaysia,
-- South Africa) use their ISO codes. Canada keeps 'CD' to stay consistent with
-- its existing employee IDs rather than the ISO 'CA'.
UPDATE company SET prefix = 'US' WHERE id = 1;   -- WSO2 - US
UPDATE company SET prefix = 'UK' WHERE id = 2;   -- WSO2 - UK
UPDATE company SET prefix = 'BR' WHERE id = 3;   -- WSO2 - BRAZIL
UPDATE company SET prefix = 'DE' WHERE id = 4;   -- WSO2 Germany GmbH
UPDATE company SET prefix = 'AU' WHERE id = 5;   -- WSO2 - AUSTRALIA
UPDATE company SET prefix = 'LK' WHERE id = 6;   -- WSO2 - SRI LANKA
UPDATE company SET prefix = 'AE' WHERE id = 7;   -- WSO2 - UAE
UPDATE company SET prefix = 'IN' WHERE id = 8;   -- WSO2 - INDIA
UPDATE company SET prefix = 'SG' WHERE id = 9;   -- WSO2 - SG
UPDATE company SET prefix = 'MY' WHERE id = 10;  -- WSO2 - MALAYSIA (no employees; ISO)
UPDATE company SET prefix = 'ES' WHERE id = 13;  -- WSO2 - SPAIN
UPDATE company SET prefix = 'ZA' WHERE id = 15;  -- WSO2 - SOUTH AFRICA (no employees; ISO)
UPDATE company SET prefix = 'CD' WHERE id = 16;  -- WSO2 - CANADA (matches existing CD... IDs)
UPDATE company SET prefix = 'NZ' WHERE id = 17;  -- WSO2 - NEW ZEALAND
