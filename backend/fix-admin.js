const { initDatabase } = require('./dist/config/database');

async function fix() {
  const db = initDatabase();

  // Update employee_id to 'admin'
  await db.query("UPDATE users SET employee_id = $1 WHERE email = $2", ['admin', 'admin']);
  console.log('✅ Updated admin employee_id to "admin"');

  // Verify
  const result = await db.query("SELECT employee_id, email, name, role FROM users WHERE email = 'admin'");
  console.log('Admin user:', result.rows[0]);

  process.exit(0);
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
