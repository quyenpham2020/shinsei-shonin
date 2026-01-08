-- Migration script for newsfeed_attachments table
-- Add storage_type and storage_path columns

-- Add columns if they don't exist
DO $$
BEGIN
    -- Add storage_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsfeed_attachments'
        AND column_name = 'storage_type'
    ) THEN
        ALTER TABLE newsfeed_attachments
        ADD COLUMN storage_type VARCHAR(20) DEFAULT 'local';
    END IF;

    -- Add storage_path column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'newsfeed_attachments'
        AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE newsfeed_attachments
        ADD COLUMN storage_path TEXT;
    END IF;
END $$;

-- Update existing rows to have storage_type = 'local'
UPDATE newsfeed_attachments
SET storage_type = 'local'
WHERE storage_type IS NULL;

-- Display result
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'newsfeed_attachments'
ORDER BY ordinal_position;
