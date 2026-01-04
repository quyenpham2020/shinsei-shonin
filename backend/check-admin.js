const { getOne } = require('./dist/config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const user = await getOne('SELECT id, employee_id, name, email, role, password FROM users WHERE employee_id = $1', ['admin']);
    if (user) {
      console.log('Admin user found:');
      console.log(JSON.stringify({
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role
      }, null, 2));

      // Test password
      const isPasswordCorrect = await bcrypt.compare('admin', user.password);
      console.log('Password "admin" is correct:', isPasswordCorrect);
    } else {
      console.log('Admin user not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
