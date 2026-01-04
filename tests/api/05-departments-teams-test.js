/**
 * Departments & Teams Module Tests
 * Tests: Department CRUD, Team Management
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

const logger = new TestLogger('Departments-Teams');
const client = new HTTPClient();
const screenshot = new ScreenshotCapture('departments-teams');

let adminToken = null;
let createdDeptId = null;
let createdTeamId = null;

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

async function testGetDepartments() {
  logger.section('TEST 1: Get All Departments');

  try {
    logger.step(1, 'Fetch all departments');
    const response = await client.get('/departments');

    const file = screenshot.saveResponse('get-departments', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get departments');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} departments`);

    if (response.data.length > 0) {
      logger.info('Departments:');
      response.data.forEach(dept => {
        logger.log(`  - [${dept.id}] ${dept.name}: ${dept.description || 'No description'}`);
      });
    }

    logger.result('Get All Departments', true, {
      totalDepartments: response.data.length,
    });
  } catch (error) {
    logger.error(`Get departments test failed: ${error.message}`);
    logger.result('Get All Departments', false, { error: error.message });
  }
}

async function testCreateDepartment() {
  logger.section('TEST 2: Create Department');

  try {
    const newDept = {
      code: `TEST${Date.now()}`,
      name: `Test Dept ${Date.now()}`,
      description: 'Test department for automated testing',
    };

    logger.step(1, 'Create new department');
    logger.info(`Department data: ${JSON.stringify(newDept, null, 2)}`);

    const response = await client.post('/departments', newDept);

    const file = screenshot.saveResponse('create-department', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Department creation should succeed');
    assertNotNull(response.data, 'Response data should exist');

    if (response.data.id) {
      createdDeptId = response.data.id;
      logger.success(`Department created with ID: ${createdDeptId}`);
    }

    logger.result('Create Department', true, {
      departmentId: createdDeptId,
      name: newDept.name,
    });
  } catch (error) {
    logger.error(`Create department test failed: ${error.message}`);
    logger.result('Create Department', false, { error: error.message });
  }
}

async function testGetTeams() {
  logger.section('TEST 3: Get All Teams');

  try {
    logger.step(1, 'Fetch all teams');
    const response = await client.get('/teams');

    const file = screenshot.saveResponse('get-teams', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get teams');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} teams`);

    if (response.data.length > 0) {
      logger.info('Teams:');
      response.data.slice(0, 10).forEach(team => {
        logger.log(`  - [${team.id}] ${team.name} (Dept: ${team.department_name || 'N/A'})`);
      });
    }

    logger.result('Get All Teams', true, {
      totalTeams: response.data.length,
    });
  } catch (error) {
    logger.error(`Get teams test failed: ${error.message}`);
    logger.result('Get All Teams', false, { error: error.message });
  }
}

async function testCreateTeam() {
  logger.section('TEST 4: Create Team');

  if (!createdDeptId) {
    logger.warning('Skipping: No department ID available');
    return;
  }

  try {
    const newTeam = {
      name: `Test Team ${Date.now()}`,
      department_id: createdDeptId,
    };

    logger.step(1, 'Create new team');
    logger.info(`Team data: ${JSON.stringify(newTeam, null, 2)}`);

    const response = await client.post('/teams', newTeam);

    const file = screenshot.saveResponse('create-team', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Team creation should succeed');
    assertNotNull(response.data, 'Response data should exist');

    if (response.data.id) {
      createdTeamId = response.data.id;
      logger.success(`Team created with ID: ${createdTeamId}`);
    }

    logger.result('Create Team', true, {
      teamId: createdTeamId,
      name: newTeam.name,
    });
  } catch (error) {
    logger.error(`Create team test failed: ${error.message}`);
    logger.result('Create Team', false, { error: error.message });
  }
}

async function testUpdateTeam() {
  logger.section('TEST 5: Update Team');

  if (!createdTeamId) {
    logger.warning('Skipping: No team ID available');
    return;
  }

  try {
    const updates = {
      name: 'Updated Test Team',
    };

    logger.step(1, `Update team ${createdTeamId}`);
    logger.info(`Updates: ${JSON.stringify(updates, null, 2)}`);

    const response = await client.put(`/teams/${createdTeamId}`, updates);

    const file = screenshot.saveResponse('update-team', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Team update should succeed');

    logger.success('Team updated successfully');

    logger.result('Update Team', true, {
      teamId: createdTeamId,
    });
  } catch (error) {
    logger.error(`Update team test failed: ${error.message}`);
    logger.result('Update Team', false, { error: error.message });
  }
}

async function testDeleteTeam() {
  logger.section('TEST 6: Delete Team');

  if (!createdTeamId) {
    logger.warning('Skipping: No team ID available');
    return;
  }

  try {
    logger.step(1, `Delete team ${createdTeamId}`);
    const response = await client.delete(`/teams/${createdTeamId}`);

    const file = screenshot.saveResponse('delete-team', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Team deletion should succeed');

    logger.success('Team deleted successfully');

    logger.result('Delete Team', true, {
      teamId: createdTeamId,
    });
  } catch (error) {
    logger.error(`Delete team test failed: ${error.message}`);
    logger.result('Delete Team', false, { error: error.message });
  }
}

async function testDeleteDepartment() {
  logger.section('TEST 7: Delete Department');

  if (!createdDeptId) {
    logger.warning('Skipping: No department ID available');
    return;
  }

  try {
    logger.step(1, `Delete department ${createdDeptId}`);
    const response = await client.delete(`/departments/${createdDeptId}`);

    const file = screenshot.saveResponse('delete-department', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Department deletion should succeed');

    logger.success('Department deleted successfully');

    logger.result('Delete Department', true, {
      departmentId: createdDeptId,
    });
  } catch (error) {
    logger.error(`Delete department test failed: ${error.message}`);
    logger.result('Delete Department', false, { error: error.message });
  }
}

async function runAllTests() {
  logger.log('Starting Departments & Teams Module Tests...', 'bright');

  try {
    await setup();
    await sleep(500);

    await testGetDepartments();
    await sleep(500);

    await testCreateDepartment();
    await sleep(500);

    await testGetTeams();
    await sleep(500);

    await testCreateTeam();
    await sleep(500);

    await testUpdateTeam();
    await sleep(500);

    await testDeleteTeam();
    await sleep(500);

    await testDeleteDepartment();

    logger.summary();
  } catch (error) {
    logger.error(`Test suite failed: ${error.message}`);
    logger.summary();
    process.exit(1);
  }
}

// Run tests
runAllTests();
