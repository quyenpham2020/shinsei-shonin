/**
 * Favorites & Feedback Module Tests
 * Tests: Favorites, Page Favorites, Feedback submission
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

const logger = new TestLogger('Favorites-Feedback');
const client = new HTTPClient();
const screenshot = new ScreenshotCapture('favorites-feedback');

let userToken = null;
let adminToken = null;
let createdFeedbackId = null;

async function setup() {
  logger.section('SETUP: Login users');

  // Login as user
  logger.step(1, 'Login as user');
  const userLogin = await client.post('/auth/login', {
    employeeId: 'quyet',
    password: 'quyet',
  });

  assertStatusOk(userLogin, 'User login must succeed');
  userToken = userLogin.data.token;
  logger.success('User authenticated');

  // Login as admin
  logger.step(2, 'Login as admin');
  const adminLogin = await client.post('/auth/login', {
    employeeId: 'admin',
    password: 'admin',
  });

  assertStatusOk(adminLogin, 'Admin login must succeed');
  adminToken = adminLogin.data.token;
  logger.success('Admin authenticated');
}

async function testGetFavorites() {
  logger.section('TEST 1: Get Favorites');

  try {
    client.setToken(userToken);

    logger.step(1, 'Fetch user favorites');
    const response = await client.get('/favorites');

    const file = screenshot.saveResponse('get-favorites', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get favorites');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} favorites`);

    if (response.data.length > 0) {
      logger.info('User favorites:');
      response.data.slice(0, 5).forEach(fav => {
        logger.log(`  - Application: ${fav.application_id}`);
      });
    }

    logger.result('Get Favorites', true, {
      totalFavorites: response.data.length,
    });
  } catch (error) {
    logger.error(`Get favorites test failed: ${error.message}`);
    logger.result('Get Favorites', false, { error: error.message });
  }
}

async function testGetPageFavorites() {
  logger.section('TEST 2: Get Page Favorites');

  try {
    client.setToken(userToken);

    logger.step(1, 'Fetch user page favorites');
    const response = await client.get('/page-favorites');

    const file = screenshot.saveResponse('get-page-favorites', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get page favorites');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} page favorites`);

    if (response.data.length > 0) {
      logger.info('Page favorites:');
      response.data.forEach(fav => {
        logger.log(`  - ${fav.page_name}: ${fav.page_url}`);
      });
    }

    logger.result('Get Page Favorites', true, {
      totalPageFavorites: response.data.length,
    });
  } catch (error) {
    logger.error(`Get page favorites test failed: ${error.message}`);
    logger.result('Get Page Favorites', false, { error: error.message });
  }
}

async function testCreatePageFavorite() {
  logger.section('TEST 3: Create Page Favorite');

  try {
    client.setToken(userToken);

    const newFavorite = {
      page_path: `/test-page-${Date.now()}`,
      page_name: 'Test Favorite Page',
    };

    logger.step(1, 'Create new page favorite');
    logger.info(`Favorite data: ${JSON.stringify(newFavorite, null, 2)}`);

    const response = await client.post('/page-favorites', newFavorite);

    const file = screenshot.saveResponse('create-page-favorite', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Page favorite creation should succeed');

    logger.success('Page favorite created successfully');

    logger.result('Create Page Favorite', true);
  } catch (error) {
    logger.error(`Create page favorite test failed: ${error.message}`);
    logger.result('Create Page Favorite', false, { error: error.message });
  }
}

async function testSubmitFeedback() {
  logger.section('TEST 4: Submit Feedback');

  try {
    client.setToken(userToken);

    const feedback = {
      category: 'suggestion',
      subject: 'Test Feedback',
      content: 'This is an automated test feedback submission',
    };

    logger.step(1, 'Submit new feedback');
    logger.info(`Feedback data: ${JSON.stringify(feedback, null, 2)}`);

    const response = await client.post('/feedback', feedback);

    const file = screenshot.saveResponse('submit-feedback', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Feedback submission should succeed');
    assertNotNull(response.data, 'Response data should exist');

    if (response.data.id) {
      createdFeedbackId = response.data.id;
      logger.success(`Feedback submitted with ID: ${createdFeedbackId}`);
    }

    logger.result('Submit Feedback', true, {
      feedbackId: createdFeedbackId,
    });
  } catch (error) {
    logger.error(`Submit feedback test failed: ${error.message}`);
    logger.result('Submit Feedback', false, { error: error.message });
  }
}

async function testGetAllFeedback() {
  logger.section('TEST 5: Get All Feedback (Admin)');

  try {
    client.setToken(adminToken);

    logger.step(1, 'Fetch all feedback (admin view)');
    const response = await client.get('/feedback');

    const file = screenshot.saveResponse('get-all-feedback', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Should get all feedback');
    assertTrue(Array.isArray(response.data), 'Should return array');

    logger.success(`Found ${response.data.length} feedback items`);

    if (response.data.length > 0) {
      logger.info('Recent feedback:');
      response.data.slice(0, 5).forEach(fb => {
        logger.log(`  - [${fb.id}] ${fb.subject} (${fb.category}) - Status: ${fb.status}`);
      });
    }

    logger.result('Get All Feedback', true, {
      totalFeedback: response.data.length,
    });
  } catch (error) {
    logger.error(`Get all feedback test failed: ${error.message}`);
    logger.result('Get All Feedback', false, { error: error.message });
  }
}

async function testUpdateFeedbackStatus() {
  logger.section('TEST 6: Update Feedback Status');

  if (!createdFeedbackId) {
    logger.warning('Skipping: No feedback ID available');
    return;
  }

  try {
    client.setToken(adminToken);

    const update = {
      status: 'in_progress',
      admin_response: 'We are looking into this feedback',
    };

    logger.step(1, `Update feedback ${createdFeedbackId}`);
    logger.info(`Update data: ${JSON.stringify(update, null, 2)}`);

    const response = await client.put(`/feedback/${createdFeedbackId}`, update);

    const file = screenshot.saveResponse('update-feedback-status', response);
    logger.info(`Response saved to: ${file}`);

    assertStatusOk(response, 'Feedback update should succeed');

    logger.success('Feedback status updated successfully');

    logger.result('Update Feedback Status', true, {
      feedbackId: createdFeedbackId,
      newStatus: update.status,
    });
  } catch (error) {
    logger.error(`Update feedback status test failed: ${error.message}`);
    logger.result('Update Feedback Status', false, { error: error.message });
  }
}

async function runAllTests() {
  logger.log('Starting Favorites & Feedback Module Tests...', 'bright');

  try {
    await setup();
    await sleep(500);

    await testGetFavorites();
    await sleep(500);

    await testGetPageFavorites();
    await sleep(500);

    await testCreatePageFavorite();
    await sleep(500);

    await testSubmitFeedback();
    await sleep(500);

    await testGetAllFeedback();
    await sleep(500);

    await testUpdateFeedbackStatus();

    logger.summary();
  } catch (error) {
    logger.error(`Test suite failed: ${error.message}`);
    logger.summary();
    process.exit(1);
  }
}

// Run tests
runAllTests();
