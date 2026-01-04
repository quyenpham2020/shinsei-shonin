/**
 * User Management Module Tests
 * Tests: User CRUD, Roles, Permissions, Department assignment
 */

const {
  TestLogger,
  HTTPClient,
  ScreenshotCapture,
  assertStatusOk,
  assertNotNull,
  assertTrue,
  sleep,
} = require('../test-utils');

const logger = new TestLogger('User-Management');
const client = new HTTPClient();
const screenshot = new ScreenshotCapture('user-management');

let adminToken = null;
let createdUserId = null;

async function setup() {
  logger.section('SETUP: Login as admin');

  const login = await client.post('/auth/login', {
    employeeId: 'admin',
    password: 'admin',
  });

  assertStatusOk(login, 'Admin login must succeed');
  adminToken = login.data.token;
  client.setToken(adminToken);

  logger.success('Admin authenticated successfully');
}

async function testGetAllUsers() {
  logger.section('TEST 1: Get All Users');

  try {
    logger.step(1, 'Fetch all users from database');
    const response = await client.get('/users');

    const file = screenshot.saveResponse('get-all-users', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get users list');
    assertNotNull(response.data, 'Data should not be null');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} users in system`);

    // Display sample users
    if (response.data.length > 0) {
      logger.info('Sample users:');
      response.data.slice(0, 5).forEach(user => {
        logger.log(`  - ${user.employee_id}: ${user.name} (${user.role}) - ${user.department}`);
      });
    }

    logger.result('Get All Users', true, {
      totalUsers: response.data.length,
      sampleCount: Math.min(5, response.data.length),
    });
  } catch (error) {
    logger.error(`Get all users test failed: ${error.message}`);
    logger.result('Get All Users', false, { error: error.message });
  }
}

async function testCreateUser() {
  logger.section('TEST 2: Create New User');

  try {
    const newUser = {
      employeeId: `test_${Date.now()}`,
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      department: 'g7',
      role: 'user',
    };

    logger.step(1, 'Create new user');
    logger.info(`Creating user: ${JSON.stringify(newUser, null, 2)}`);

    const response = await client.post('/users', newUser);

    const file = screenshot.saveResponse('create-user', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'User creation should succeed');
    assertNotNull(response.data, 'Response data should exist');

    if (response.data.id) {
      createdUserId = response.data.id;
      logger.success(`User created successfully with ID: ${createdUserId}`);
    }

    logger.result('Create New User', true, {
      userId: createdUserId,
      employeeId: newUser.employeeId,
    });
  } catch (error) {
    logger.error(`Create user test failed: ${error.message}`);
    logger.result('Create New User', false, { error: error.message });
  }
}

async function testGetUserById() {
  logger.section('TEST 3: Get User by ID');

  if (!createdUserId) {
    logger.warning('Skipping: No user ID available');
    return;
  }

  try {
    logger.step(1, `Fetch user with ID: ${createdUserId}`);
    const response = await client.get(`/users/${createdUserId}`);

    const file = screenshot.saveResponse('get-user-by-id', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get user details');
    assertNotNull(response.data, 'User data should exist');
    assertTrue(response.data.id === createdUserId, 'User ID should match');

    logger.success(`User details retrieved: ${response.data.name}`);
    logger.info(`User info: ${JSON.stringify(response.data, null, 2)}`);

    logger.result('Get User by ID', true, {
      userId: createdUserId,
      name: response.data.name,
    });
  } catch (error) {
    logger.error(`Get user by ID test failed: ${error.message}`);
    logger.result('Get User by ID', false, { error: error.message });
  }
}

async function testUpdateUser() {
  logger.section('TEST 4: Update User');

  if (!createdUserId) {
    logger.warning('Skipping: No user ID available');
    return;
  }

  try {
    const updates = {
      name: 'Updated Test User',
      department: 'g1',
    };

    logger.step(1, `Update user ${createdUserId}`);
    logger.info(`Updates: ${JSON.stringify(updates, null, 2)}`);

    const response = await client.put(`/users/${createdUserId}`, updates);

    const file = screenshot.saveResponse('update-user', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'User update should succeed');

    logger.success('User updated successfully');

    // Verify update
    logger.step(2, 'Verify update');
    const verify = await client.get(`/users/${createdUserId}`);

    assertTrue(verify.data.name === updates.name, 'Name should be updated');
    assertTrue(verify.data.department === updates.department, 'Department should be updated');

    logger.success('Update verified successfully');

    logger.result('Update User', true, {
      userId: createdUserId,
      updates: updates,
    });
  } catch (error) {
    logger.error(`Update user test failed: ${error.message}`);
    logger.result('Update User', false, { error: error.message });
  }
}

async function testUserRoles() {
  logger.section('TEST 5: User Roles & Permissions');

  try {
    logger.step(1, 'Get users grouped by role');
    const response = await client.get('/users');

    assertStatusOk(response, 'Should get users');

    const roleGroups = {};
    response.data.forEach(user => {
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = [];
      }
      roleGroups[user.role].push(user);
    });

    logger.info('Users by role:');
    Object.entries(roleGroups).forEach(([role, users]) => {
      logger.log(`  ${role}: ${users.length} users`);
    });

    logger.result('User Roles & Permissions', true, {
      roles: Object.keys(roleGroups),
      distribution: Object.fromEntries(
        Object.entries(roleGroups).map(([k, v]) => [k, v.length])
      ),
    });
  } catch (error) {
    logger.error(`User roles test failed: ${error.message}`);
    logger.result('User Roles & Permissions', false, { error: error.message });
  }
}

async function testDeleteUser() {
  logger.section('TEST 6: Delete User');

  if (!createdUserId) {
    logger.warning('Skipping: No user ID available');
    return;
  }

  try {
    logger.step(1, `Delete user ${createdUserId}`);
    const response = await client.delete(`/users/${createdUserId}`);

    const file = screenshot.saveResponse('delete-user', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'User deletion should succeed');

    logger.success('User deleted successfully');

    // Verify deletion
    logger.step(2, 'Verify deletion');
    const verify = await client.get(`/users/${createdUserId}`);

    assertTrue(!verify.ok || verify.status === 404, 'User should not exist');

    logger.success('Deletion verified');

    logger.result('Delete User', true, {
      userId: createdUserId,
    });
  } catch (error) {
    logger.error(`Delete user test failed: ${error.message}`);
    logger.result('Delete User', false, { error: error.message });
  }
}

async function runAllTests() {
  logger.log('Starting User Management Module Tests...', 'bright');

  try {
    await setup();
    await sleep(500);

    await testGetAllUsers();
    await sleep(500);

    await testCreateUser();
    await sleep(500);

    await testGetUserById();
    await sleep(500);

    await testUpdateUser();
    await sleep(500);

    await testUserRoles();
    await sleep(500);

    await testDeleteUser();

    logger.summary();
  } catch (error) {
    logger.error(`Test suite failed: ${error.message}`);
    logger.summary();
    process.exit(1);
  }
}

// Run tests
runAllTests();
