-- Migration script for Anonymous Counting & Categories features
-- Created: 2026-01-08

-- ============================================
-- Part 1: Anonymous Mapping Table
-- ============================================

-- Create anonymous mapping table
CREATE TABLE IF NOT EXISTS newsfeed_anonymous_mapping (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  anonymous_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (post_id) REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(post_id, user_id),
  UNIQUE(post_id, anonymous_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_anonymous_mapping_post ON newsfeed_anonymous_mapping(post_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_mapping_user ON newsfeed_anonymous_mapping(user_id);

-- ============================================
-- Part 2: Categories Table
-- ============================================

-- Create categories table
CREATE TABLE IF NOT EXISTS newsfeed_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(20),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for active categories
CREATE INDEX IF NOT EXISTS idx_categories_active ON newsfeed_categories(is_active, display_order);

-- Insert default categories
INSERT INTO newsfeed_categories (name, name_en, icon, color, display_order)
VALUES
  ('一般', 'General', 'article', '#757575', 1),
  ('ノウハウ', 'Know-how', 'lightbulb', '#ff9800', 2),
  ('イベント写真', 'Event Photos', 'photo_camera', '#2196f3', 3),
  ('投票', 'Vote', 'poll', '#9c27b0', 4),
  ('グルメ・遊び', 'Food & Fun', 'restaurant', '#f44336', 5),
  ('お知らせ', 'Announcement', 'campaign', '#4caf50', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Part 3: Add category_id to newsfeed_posts
-- ============================================

-- Add category_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'newsfeed_posts'
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE newsfeed_posts
    ADD COLUMN category_id INTEGER,
    ADD FOREIGN KEY (category_id) REFERENCES newsfeed_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Migrate existing post_type to category_id
UPDATE newsfeed_posts p
SET category_id = c.id
FROM newsfeed_categories c
WHERE p.category_id IS NULL
  AND (
    (p.post_type = 'general' AND c.name = '一般') OR
    (p.post_type = 'announcement' AND c.name = 'お知らせ') OR
    (p.post_type = 'knowhow' AND c.name = 'ノウハウ')
  );

-- Set default category for posts without category
UPDATE newsfeed_posts
SET category_id = (SELECT id FROM newsfeed_categories WHERE name = '一般' LIMIT 1)
WHERE category_id IS NULL;

-- ============================================
-- Verification Queries
-- ============================================

-- Show created tables
SELECT 'Anonymous Mapping Table:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'newsfeed_anonymous_mapping'
ORDER BY ordinal_position;

SELECT 'Categories Table:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'newsfeed_categories'
ORDER BY ordinal_position;

-- Show categories with post counts
SELECT 'Categories with Post Counts:' as info;
SELECT
  c.id,
  c.name,
  c.name_en,
  c.icon,
  c.color,
  c.display_order,
  c.is_active,
  COUNT(p.id) as post_count
FROM newsfeed_categories c
LEFT JOIN newsfeed_posts p ON c.id = p.category_id
GROUP BY c.id
ORDER BY c.display_order;
