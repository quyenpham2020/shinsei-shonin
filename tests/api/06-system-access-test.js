/**
 * System Access Module Tests
 * Tests: Get user access, Bulk update access
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

const logger = new TestLogger('System-Access');
const client = new HTTPClient();
const screenshot = new ScreenshotCapture('system-access');

let adminToken = null;
let userToken = null;
let testUserId = null;

async function setup() {
  logger.section('SETUP: Login users');

  // Login as admin
  logger.step(1, 'Login as admin');
  const adminLogin = await client.post('/auth/login', {
    employeeId: 'admin',
    password: 'admin',
  });

  assertStatusOk(adminLogin, 'Admin login must succeed');
  adminToken = adminLogin.data.token;
  logger.success('Admin authenticated');

  // Login as user
  logger.step(2, 'Login as user');
  const userLogin = await client.post('/auth/login', {
    employeeId: 'quyet',
    password: 'quyet',
  });

  assertStatusOk(userLogin, 'User login must succeed');
  userToken = userLogin.data.token;
  testUserId = userLogin.data.user.id;
  logger.success(`User authenticated (ID: ${testUserId})`);
}

async function testGetMyAccess() {
  logger.section('TEST 1: Get My System Access');

  try {
    logger.step(1, 'Get admin system access');
    client.setToken(adminToken);
    const adminAccess = await client.get('/system-access/my-access');

    const adminFile = screenshot.saveResponse('admin-my-access', adminAccess);
    logger.info(`Response saved to: ${adminFile}`);

    assertStatusOk(adminAccess, 'Should get admin access');
    assertNotNull(adminAccess.data.systems, 'Systems should exist');

    logger.success(`Admin access: ${adminAccess.data.systems.join(', ') || 'All systems'}`);

    logger.step(2, 'Get user system access');
    client.setToken(userToken);
    const userAccess = await client.get('/system-access/my-access');

    const userFile = screenshot.saveResponse('user-my-access', userAccess);
    logger.info(`Response saved to: ${userFile}`);

    assertStatusOk(userAccess, 'Should get user access');
    assertNotNull(userAccess.data.systems, 'Systems should exist');

    logger.success(`User access: ${userAccess.data.systems.join(', ')}`);

    logger.result('Get My System Access', true, {
      adminSystems: adminAccess.data.systems,
      userSystems: userAccess.data.systems,
    });
  } catch (error) {
    logger.error(`Get my access test failed: ${error.message}`);
    logger.result('Get My System Access', false, { error: error.message });
  }
}

async function testGetAllUsersWithAccess() {
  logger.section('TEST 2: Get All Users With Access');

  try {
    client.setToken(adminToken);

    logger.step(1, 'Fetch all users with their system access');
    const response = await client.get('/system-access/users');

    const file = screenshot.saveResponse('get-users-with-access', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get users with access');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} users`);

    if (response.data.length > 0) {
      logger.info('Sample users with access:');
      response.data.slice(0, 5).forEach(user => {
        const systems = Array.isArray(user.systems) ? user.systems.join(', ') : 'None';
        logger.log(`  - ${user.employee_id}: ${user.name} - [${systems}]`);
      });
    }

    logger.result('Get All Users With Access', true, {
      totalUsers: response.data.length,
    });
  } catch (error) {
    logger.error(`Get all users with access test failed: ${error.message}`);
    logger.result('Get All Users With Access', false, { error: error.message });
  }
}

async function testBulkUpdateAccess() {
  logger.section('TEST 3: Bulk Update System Access');

  if (!testUserId) {
    logger.warning('Skipping: No test user ID available');
    return;
  }

  try {
    client.setToken(adminToken);

    // Get current access
    logger.step(1, 'Get current user access');
    client.setToken(userToken);
    const currentAccess = await client.get('/system-access/my-access');
    const currentSystems = currentAccess.data.systems || [];

    logger.info(`Current systems: ${currentSystems.join(', ')}`);

    // Update access
    logger.step(2, 'Update system access');
    client.setToken(adminToken);

    const updates = [
      {
        userId: testUserId,
        systems: ['shinsei-shonin', 'weekly-report'],
      },
    ];

    logger.info(`Updating access: ${JSON.stringify(updates, null, 2)}`);

    const response = await client.post('/system-access/bulk-update', {
      updates: updates,
    });

    const file = screenshot.saveResponse('bulk-update-access', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Bulk update should succeed');

    logger.success('System access updated successfully');

    // Verify update
    logger.step(3, 'Verify updated access');
    client.setToken(userToken);
    const verifyAccess = await client.get('/system-access/my-access');

    logger.info(`Updated systems: ${verifyAccess.data.systems.join(', ')}`);

    logger.result('Bulk Update System Access', true, {
      userId: testUserId,
      updatedSystems: verifyAccess.data.systems,
    });
  } catch (error) {
    logger.error(`Bulk update access test failed: ${error.message}`);
    logger.result('Bulk Update System Access', false, { error: error.message });
  }
}

async function testAccessRestriction() {
  logger.section('TEST 4: Access Restriction Verification');

  try {
    logger.step(1, 'Test non-admin cannot update access');
    client.setToken(userToken);

    const unauthorizedUpdate = await client.post('/system-access/bulk-update', {
      updates: [{
        userId: testUserId,
        systems: ['all-systems'],
      }],
    });

    // Should fail with 403 or similar
    if (unauthorizedUpdate.ok) {
      logger.warning('Non-admin was able to update access (check permissions!)');
      logger.result('Access Restriction Verification', false, {
        issue: 'Non-admin should not be able to update access',
      });
    } else {
      logger.success('Non-admin correctly denied access to update');
      logger.result('Access Restriction Verification', true);
    }
  } catch (error) {
    logger.error(`Access restriction test failed: ${error.message}`);
    logger.result('Access Restriction Verification', false, { error: error.message });
  }
}

async function runAllTests() {
  logger.log('Starting System Access Module Tests...', 'bright');

  try {
    await setup();
    await sleep(500);

    await testGetMyAccess();
    await sleep(500);

    await testGetAllUsersWithAccess();
    await sleep(500);

    await testBulkUpdateAccess();
    await sleep(500);

    await testAccessRestriction();

    logger.summary();
  } catch (error) {
    logger.error(`Test suite failed: ${error.message}`);
    logger.summary();
    process.exit(1);
  }
}

// Run tests
runAllTests();
