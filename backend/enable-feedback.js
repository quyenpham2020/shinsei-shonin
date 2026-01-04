const { runQuery } = require('./dist/config/database');

(async () => {
  try {
    await runQuery(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
    `, ['feedback_enabled', '1', 'Enable feedback system']);

    console.log('Feedback system enabled successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
