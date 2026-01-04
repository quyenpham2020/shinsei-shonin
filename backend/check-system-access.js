const { getAll } = require('./dist/config/database');

(async () => {
  try {
    const users = await getAll(`
      SELECT
        u.employee_id,
        u.name,
        STRING_AGG(usa.system_id, ',') as systems
      FROM users u
      LEFT JOIN user_system_access usa ON u.id = usa.user_id
      WHERE u.employee_id IN ($1, $2)
      GROUP BY u.employee_id, u.name
    `, ['teamlead001', 'dev001']);

    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
