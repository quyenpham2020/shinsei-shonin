const { runQuery, getOne } = require('./dist/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('admin', 10);
    await runQuery('UPDATE users SET password = $1 WHERE employee_id = $2', [hashedPassword, 'admin']);

    const user = await getOne('SELECT id, employee_id, name, email, role FROM users WHERE employee_id = $1', ['admin']);
    console.log('Admin password reset successfully for user:');
    console.log(JSON.stringify(user, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
