-- Run this once against an existing Evangadi Forum database.
-- Google-only accounts do not have a local password, so password_hash must be nullable.

ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NULL,
    ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER password_hash,
    ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local' AFTER google_id;
