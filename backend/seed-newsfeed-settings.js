const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shinsei_shonin',
  ssl: false,
});

async function seedSettings() {
  try {
    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES ('allow_anonymous_posts', 'true', 'Allow users to post anonymously in Newsfeed')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES ('allow_anonymous_comments', 'true', 'Allow users to comment anonymously in Newsfeed')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    console.log('✅ Newsfeed settings seeded successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedSettings();
