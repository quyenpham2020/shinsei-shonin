/**
 * Weekly Reports Module Tests
 * Tests: Create, List, Update, Delete Weekly Reports
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

const logger = new TestLogger('Weekly-Reports');
const client = new HTTPClient();
const screenshot = new ScreenshotCapture('weekly-reports');

let userToken = null;
let createdReportId = null;

async function setup() {
  logger.section('SETUP: Login as user');

  const login = await client.post('/auth/login', {
    employeeId: 'quyet',
    password: 'quyet',
  });

  assertStatusOk(login, 'User login must succeed');
  userToken = login.data.token;
  client.setToken(userToken);

  logger.success(`User logged in: ${login.data.user.name}`);
}

async function testCreateWeeklyReport() {
  logger.section('TEST 1: Create Weekly Report');

  try {
    const report = {
      content: 'Test weekly report - Completed testing framework and created comprehensive test scripts for all modules',
      achievements: 'Completed testing framework, Created test scripts',
      challenges: 'None',
      nextWeekPlan: 'Continue with more tests',
      weekStart: '2025-01-06',
    };

    logger.step(1, 'Create new weekly report');
    logger.info(`Report data: ${JSON.stringify(report, null, 2)}`);

    const response = await client.post('/weekly-reports', report);

    const file = screenshot.saveResponse('create-weekly-report', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Weekly report creation should succeed');
    assertNotNull(response.data, 'Response data should exist');

    if (response.data.id) {
      createdReportId = response.data.id;
      logger.success(`Weekly report created with ID: ${createdReportId}`);
    }

    logger.result('Create Weekly Report', true, {
      reportId: createdReportId,
      weekStartDate: report.week_start_date,
    });
  } catch (error) {
    logger.error(`Create weekly report test failed: ${error.message}`);
    logger.result('Create Weekly Report', false, { error: error.message });
  }
}

async function testGetWeeklyReports() {
  logger.section('TEST 2: Get Weekly Reports');

  try {
    logger.step(1, 'Fetch all weekly reports');
    const response = await client.get('/weekly-reports/my');

    const file = screenshot.saveResponse('get-weekly-reports', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get weekly reports');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} weekly reports`);

    if (response.data.length > 0) {
      logger.info('Recent reports:');
      response.data.slice(0, 5).forEach(report => {
        logger.log(`  - [${report.id}] Week: ${report.week_start_date} - ${report.content ? report.content.substring(0, 50) : 'N/A'}`);
      });
    }

    logger.result('Get Weekly Reports', true, {
      totalReports: response.data.length,
    });
  } catch (error) {
    logger.error(`Get weekly reports test failed: ${error.message}`);
    logger.result('Get Weekly Reports', false, { error: error.message });
  }
}

async function testGetWeeklyReportDetail() {
  logger.section('TEST 3: Get Weekly Report Detail');

  if (!createdReportId) {
    logger.warning('Skipping: No report ID available');
    return;
  }

  try {
    logger.step(1, `Fetch weekly report detail for ID: ${createdReportId}`);
    const response = await client.get(`/weekly-reports/${createdReportId}`);

    const file = screenshot.saveResponse('get-weekly-report-detail', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get weekly report detail');
    assertNotNull(response.data, 'Report data should exist');

    logger.success(`Report details retrieved`);
    logger.info(`Content: ${response.data.content ? response.data.content.substring(0, 100) : 'N/A'}`);
    logger.info(`Achievements: ${response.data.achievements || 'N/A'}`);

    logger.result('Get Weekly Report Detail', true, {
      reportId: createdReportId,
    });
  } catch (error) {
    logger.error(`Get weekly report detail test failed: ${error.message}`);
    logger.result('Get Weekly Report Detail', false, { error: error.message });
  }
}

async function testUpdateWeeklyReport() {
  logger.section('TEST 4: Update Weekly Report');

  if (!createdReportId) {
    logger.warning('Skipping: No report ID available');
    return;
  }

  try {
    const updates = {
      content: 'Updated test weekly report content - All tests passing',
      achievements: 'Updated achievements - All tests passing',
    };

    logger.step(1, `Update weekly report ${createdReportId}`);
    logger.info(`Updates: ${JSON.stringify(updates, null, 2)}`);

    const response = await client.put(`/weekly-reports/${createdReportId}`, updates);

    const file = screenshot.saveResponse('update-weekly-report', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Update should succeed');

    logger.success('Weekly report updated successfully');

    // Verify update
    logger.step(2, 'Verify update');
    const verify = await client.get(`/weekly-reports/${createdReportId}`);

    assertTrue(verify.data.content === updates.content, 'Content should be updated');

    logger.success('Update verified');

    logger.result('Update Weekly Report', true, {
      reportId: createdReportId,
    });
  } catch (error) {
    logger.error(`Update weekly report test failed: ${error.message}`);
    logger.result('Update Weekly Report', false, { error: error.message });
  }
}

async function testGenerateOverview() {
  logger.section('TEST 5: Generate AI Overview');

  if (!createdReportId) {
    logger.warning('Skipping: No report ID available');
    return;
  }

  try {
    logger.step(1, `Generate AI overview for report ${createdReportId}`);
    const response = await client.post(`/weekly-reports/generate-overview`, {
      reportId: createdReportId,
    });

    const file = screenshot.saveResponse('generate-overview', response);
    logger.info(`Response saved to: ${file}`);

    if (response.ok) {
      logger.success('AI overview generated successfully');
      logger.info(`Overview: ${response.data.overview}`);
      logger.result('Generate AI Overview', true);
    } else {
      logger.warning('AI overview generation failed (API key not configured?)');
      logger.result('Generate AI Overview', false, {
        note: 'Feature may require API configuration'
      });
    }
  } catch (error) {
    logger.warning(`Generate AI overview test skipped: ${error.message}`);
    logger.result('Generate AI Overview', false, { error: error.message });
  }
}

async function testDeleteWeeklyReport() {
  logger.section('TEST 6: Delete Weekly Report');

  if (!createdReportId) {
    logger.warning('Skipping: No report ID available');
    return;
  }

  try {
    logger.step(1, `Delete weekly report ${createdReportId}`);
    const response = await client.delete(`/weekly-reports/${createdReportId}`);

    const file = screenshot.saveResponse('delete-weekly-report', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Deletion should succeed');

    logger.success('Weekly report deleted successfully');

    // Verify deletion
    logger.step(2, 'Verify deletion');
    const verify = await client.get(`/weekly-reports/${createdReportId}`);

    assertTrue(!verify.ok || verify.status === 404, 'Report should not exist');

    logger.success('Deletion verified');

    logger.result('Delete Weekly Report', true, {
      reportId: createdReportId,
    });
  } catch (error) {
    logger.error(`Delete weekly report test failed: ${error.message}`);
    logger.result('Delete Weekly Report', false, { error: error.message });
  }
}

async function runAllTests() {
  logger.log('Starting Weekly Reports Module Tests...', 'bright');

  try {
    await setup();
    await sleep(500);

    await testCreateWeeklyReport();
    await sleep(500);

    await testGetWeeklyReports();
    await sleep(500);

    await testGetWeeklyReportDetail();
    await sleep(500);

    await testUpdateWeeklyReport();
    await sleep(500);

    await testGenerateOverview();
    await sleep(500);

    await testDeleteWeeklyReport();

    logger.summary();
  } catch (error) {
    logger.error(`Test suite failed: ${error.message}`);
    logger.summary();
    process.exit(1);
  }
}

// Run tests
runAllTests();
