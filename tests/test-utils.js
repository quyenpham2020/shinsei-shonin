/**
 * Test Utilities Framework
 * Common utilities for all test scripts
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class TestLogger {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.startTime = Date.now();
    this.testResults = [];
    this.logFile = path.join(__dirname, 'logs', `${moduleName}-${Date.now()}.log`);

    // Ensure logs directory exists
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.log(`\n${'='.repeat(80)}\n`, 'bright');
    this.log(`TEST MODULE: ${moduleName}`, 'cyan');
    this.log(`Started at: ${new Date().toLocaleString()}`, 'cyan');
    this.log(`${'='.repeat(80)}\n`, 'bright');
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    const colorCode = colors[color] || colors.reset;
    const formattedMessage = `${colorCode}${message}${colors.reset}`;

    console.log(formattedMessage);

    // Write to log file (without color codes)
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logMessage);
  }

  section(title) {
    this.log(`\n${'-'.repeat(80)}`, 'bright');
    this.log(title, 'bright');
    this.log('-'.repeat(80), 'bright');
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  error(message) {
    this.log(`❌ ${message}`, 'red');
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  step(stepNumber, description) {
    this.log(`\n[Step ${stepNumber}] ${description}`, 'magenta');
  }

  result(testName, passed, details = null) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString(),
    });

    if (passed) {
      this.success(`TEST PASSED: ${testName}`);
    } else {
      this.error(`TEST FAILED: ${testName}`);
    }

    if (details) {
      this.log(`  Details: ${JSON.stringify(details, null, 2)}`, 'reset');
    }
  }

  summary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    this.log(`\n${'='.repeat(80)}`, 'bright');
    this.log('TEST SUMMARY', 'cyan');
    this.log('='.repeat(80), 'bright');
    this.log(`Total Tests: ${total}`, 'bright');
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
    this.log(`Duration: ${duration}s`, 'blue');
    this.log(`Log file: ${this.logFile}`, 'blue');
    this.log('='.repeat(80) + '\n', 'bright');

    // Save summary to JSON
    const summaryFile = path.join(__dirname, 'logs', `${this.moduleName}-summary.json`);
    fs.writeFileSync(summaryFile, JSON.stringify({
      moduleName: this.moduleName,
      timestamp: new Date().toISOString(),
      duration: duration,
      total: total,
      passed: passed,
      failed: failed,
      results: this.testResults,
    }, null, 2));

    return { passed, failed, total, duration };
  }
}

class HTTPClient {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type');

      let responseData;
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        status: response.status,
        ok: response.ok,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        error: error.message,
      };
    }
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  async patch(endpoint, data) {
    return this.request('PATCH', endpoint, data);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

class ScreenshotCapture {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.screenshotDir = path.join(__dirname, 'screenshots', moduleName);

    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  saveResponse(stepName, response) {
    const filename = `${stepName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    const filepath = path.join(this.screenshotDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(response, null, 2));

    return filepath;
  }

  saveHTML(stepName, html) {
    const filename = `${stepName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.html`;
    const filepath = path.join(this.screenshotDir, filename);

    fs.writeFileSync(filepath, html);

    return filepath;
  }
}

// Assertion helpers
function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertNotNull(value, message = '') {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message}\nValue is null or undefined`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}\nCondition is false`);
  }
}

function assertStatusOk(response, message = '') {
  if (!response.ok) {
    throw new Error(`Assertion failed: ${message}\nStatus: ${response.status}\nResponse: ${JSON.stringify(response.data)}`);
  }
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  TestLogger,
  HTTPClient,
  ScreenshotCapture,
  assertEquals,
  assertNotNull,
  assertTrue,
  assertStatusOk,
  sleep,
};
