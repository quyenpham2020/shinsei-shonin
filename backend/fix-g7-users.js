const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:vtinagoya@localhost:5432/shinsei_shonin'
});

async function fix() {
  const result = await pool.query(
    'UPDATE users SET department = $1 WHERE LOWER(department) = $2',
    ['VTI Nagoya', 'g7']
  );
  console.log(`✓ Updated ${result.rowCount} users from "g7" to "VTI Nagoya"`);
  await pool.end();
}

fix().catch(console.error);
