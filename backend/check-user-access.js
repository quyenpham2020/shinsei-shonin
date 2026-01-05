require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:vtinagoya@localhost:5432/shinsei_shonin',
});

async function checkUserAccess() {
  try {
    console.log('\n=== Checking User Access for "quyet" ===\n');

    // 1. Check if user exists (using employee_id as login identifier)
    const userResult = await pool.query(
      'SELECT id, employee_id, name, email, role, department FROM users WHERE employee_id = $1',
      ['quyet']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User "quyet" not found in database');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log(user);

    // 2. Check systems table
    console.log('\n=== Available Systems ===\n');
    const systemsResult = await pool.query('SELECT * FROM systems ORDER BY id');
    console.log(systemsResult.rows);

    // 3. Check user_system_access table
    console.log('\n=== User System Access ===\n');
    const accessResult = await pool.query(
      'SELECT * FROM user_system_access WHERE user_id = $1',
      [user.id]
    );

    if (accessResult.rows.length === 0) {
      console.log('❌ No system access found for user');
    } else {
      console.log('✅ System access found:');
      console.log(accessResult.rows);
    }

    // 4. Check full query as used in the controller
    console.log('\n=== Full Query (as in controller) ===\n');
    const fullResult = await pool.query(`
      SELECT
        u.id,
        u.employee_id,
        u.name,
        u.email,
        u.department,
        t.name as team_name,
        u.role,
        STRING_AGG(usa.system_id, ',') as systems
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN user_system_access usa ON u.id = usa.user_id
      WHERE u.employee_id = $1
      GROUP BY u.id, u.employee_id, u.name, u.email, u.department, t.name, u.role
    `, ['quyet']);

    console.log(fullResult.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserAccess();
