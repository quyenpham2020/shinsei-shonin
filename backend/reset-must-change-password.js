const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:vtinagoya@localhost:5432/shinsei_shonin',
  ssl: false,
});

async function resetMustChangePassword() {
  try {
    console.log('Resetting mustChangePassword flag for users...');

    // Reset for quyet
    await pool.query(`
      UPDATE users
      SET must_change_password = false
      WHERE employee_id = 'quyet'
    `);
    console.log('✓ Reset for user: quyet');

    // Reset for van
    await pool.query(`
      UPDATE users
      SET must_change_password = false
      WHERE employee_id = 'van'
    `);
    console.log('✓ Reset for user: van');

    // Verify
    const result = await pool.query(`
      SELECT employee_id, name, must_change_password
      FROM users
      WHERE employee_id IN ('quyet', 'van')
    `);

    console.log('\nUpdated users:');
    result.rows.forEach(user => {
      console.log(`  - ${user.employee_id}: mustChangePassword = ${user.must_change_password}`);
    });

    console.log('\n✅ Done! Users can now access all functions.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetMustChangePassword();
