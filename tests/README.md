# Shinsei-Shonin Test Suite

Comprehensive automated testing framework for the Shinsei-Shonin application system.

## 📋 Overview

This test suite provides automated API testing for all major features of the Shinsei-Shonin system:

- **Authentication** - Login, logout, password management, system access
- **User Management** - CRUD operations, roles, permissions
- **Application Management** - Create, approve, reject applications
- **Weekly Reports** - Report creation, updates, AI overview generation
- **Departments & Teams** - Organization structure management
- **System Access** - User access control and permissions
- **Favorites & Feedback** - User preferences and feedback system

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Backend server running on http://localhost:3001
- Database initialized with test data

### Installation

The test suite uses Node.js built-in modules and doesn't require additional dependencies.

### Running Tests

#### Run All Tests

```bash
cd tests
node run-all-tests.js
```

#### Run Individual Test Modules

```bash
# Authentication tests
node api/01-auth-test.js

# User management tests
node api/02-users-test.js

# Application management tests
node api/03-applications-test.js

# Weekly reports tests
node api/04-weekly-reports-test.js

# Departments & Teams tests
node api/05-departments-teams-test.js

# System access tests
node api/06-system-access-test.js

# Favorites & Feedback tests
node api/07-favorites-feedback-test.js
```

## 📁 Directory Structure

```
tests/
├── api/                          # Individual test modules
│   ├── 01-auth-test.js          # Authentication tests
│   ├── 02-users-test.js         # User management tests
│   ├── 03-applications-test.js  # Application tests
│   ├── 04-weekly-reports-test.js # Weekly reports tests
│   ├── 05-departments-teams-test.js # Org structure tests
│   ├── 06-system-access-test.js # Access control tests
│   └── 07-favorites-feedback-test.js # Favorites & feedback tests
├── logs/                         # Test execution logs
│   ├── *.log                    # Detailed test logs
│   ├── *-summary.json           # Individual test summaries
│   └── master-report-*.json     # Overall test reports
├── screenshots/                  # API response captures
│   └── [module-name]/           # Organized by module
│       └── *.json               # Response snapshots
├── test-utils.js                # Test framework utilities
├── run-all-tests.js             # Master test runner
└── README.md                     # This file
```

## 🧪 Test Modules

### 1. Authentication (01-auth-test.js)

Tests user authentication and authorization:

- ✅ Admin login
- ✅ Regular user login
- ✅ Invalid credentials handling
- ✅ System access verification
- ✅ Password operations
- ✅ Token validation
- ✅ Authorization headers

**Expected Output:**
```
[Step 1] Login as admin user
✅ Admin logged in: admin (g7)
ℹ️  Token: eyJhbGciOiJIUzI1NiIs...
```

### 2. User Management (02-users-test.js)

Tests user CRUD operations:

- ✅ Get all users
- ✅ Create new user
- ✅ Get user by ID
- ✅ Update user information
- ✅ User roles verification
- ✅ Delete user

**Expected Output:**
```
✅ Found 25 users in system
✅ User created successfully with ID: 42
✅ User updated successfully
```

### 3. Application Management (03-applications-test.js)

Tests application workflow:

- ✅ Get application types
- ✅ Create new application
- ✅ List applications
- ✅ Get application details
- ✅ Approve application
- ✅ Filter applications

**Expected Output:**
```
✅ Found 3 application types
✅ Application created with ID: 123
✅ Application approved successfully
```

### 4. Weekly Reports (04-weekly-reports-test.js)

Tests weekly report management:

- ✅ Create weekly report
- ✅ Get all reports
- ✅ Get report details
- ✅ Update report
- ✅ Generate AI overview
- ✅ Delete report

**Expected Output:**
```
✅ Weekly report created with ID: 45
✅ Report details retrieved
✅ AI overview generated successfully
```

### 5. Departments & Teams (05-departments-teams-test.js)

Tests organizational structure:

- ✅ Get departments
- ✅ Create department
- ✅ Get teams
- ✅ Create team
- ✅ Update team
- ✅ Delete team/department

**Expected Output:**
```
✅ Found 7 departments
✅ Department created with ID: 8
✅ Team created with ID: 15
```

### 6. System Access (06-system-access-test.js)

Tests access control:

- ✅ Get my access
- ✅ Get all users with access
- ✅ Bulk update access
- ✅ Access restriction verification

**Expected Output:**
```
✅ Admin access: shinsei-shonin,weekly-report,master-management
✅ User access: shinsei-shonin,weekly-report
✅ System access updated successfully
```

### 7. Favorites & Feedback (07-favorites-feedback-test.js)

Tests user preferences and feedback:

- ✅ Get favorites
- ✅ Get page favorites
- ✅ Create page favorite
- ✅ Submit feedback
- ✅ Get all feedback (admin)
- ✅ Update feedback status

**Expected Output:**
```
✅ Found 5 favorites
✅ Page favorite created successfully
✅ Feedback submitted with ID: 78
```

## 📊 Test Output

### Console Output

Tests provide colored, formatted output with:
- ✅ Success indicators (green)
- ❌ Error indicators (red)
- ℹ️  Information messages (blue)
- ⚠️  Warnings (yellow)

### Log Files

Detailed logs are saved in `logs/` directory:
- Individual test logs: `[Module-Name]-[timestamp].log`
- Summary JSON: `[Module-Name]-summary.json`
- Master report: `master-report-[timestamp].json`

### Response Snapshots

API responses are saved as JSON in `screenshots/` directory for debugging and verification.

## 🔧 Configuration

### Test Credentials

Default test credentials (modify in individual test files):

```javascript
const testUsers = {
  admin: { employeeId: 'admin', password: 'admin123' },
  user: { employeeId: 'quyet', password: 'quyet' },
};
```

### API Base URL

Default: `http://localhost:3001/api`

Modify in test files:
```javascript
const client = new HTTPClient('http://your-server:port/api');
```

## 📈 Understanding Test Results

### Individual Test Summary

```
TEST SUMMARY
Total Tests: 6
Passed: 6
Failed: 0
Duration: 3.45s
```

### Master Report

```
OVERALL STATISTICS
Total Test Suites: 7
Passed Suites: 7
Failed Suites: 0
Total Individual Tests: 42
Passed Tests: 42
Failed Tests: 0
Total Duration: 24.35s
```

## 🐛 Troubleshooting

### Backend Not Running

Error: `Connection refused`

**Solution:** Start the backend server:
```bash
cd backend
npm run dev
```

### Database Not Initialized

Error: `Table does not exist`

**Solution:** Initialize database schema:
```bash
cd backend
# Database will initialize on server start
npm run dev
```

### Authentication Failed

Error: `401 Unauthorized`

**Solution:**
- Verify test credentials exist in database
- Check password is correct
- Ensure user has not been deleted

### Test Failed Due to Missing Data

Error: `404 Not Found` or `No data available`

**Solution:**
- Run tests in order (authentication first)
- Ensure previous tests completed successfully
- Check database has required seed data

## 🔄 Continuous Integration

### Example CI/CD Usage

```yaml
# .github/workflows/test.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start backend
        run: |
          cd backend
          npm install
          npm run dev &
          sleep 10
      - name: Run tests
        run: |
          cd tests
          node run-all-tests.js
```

## 📝 Adding New Tests

### Create a New Test Module

```javascript
const {
  TestLogger,
  HTTPClient,
  ScreenshotCapture,
  assertStatusOk,
  sleep,
} = require('../test-utils');

const logger = new TestLogger('My-New-Module');
const client = new HTTPClient();
const screenshot = new ScreenshotCapture('my-module');

async function testFeature() {
  logger.section('TEST 1: Feature Name');

  try {
    logger.step(1, 'Test description');
    const response = await client.get('/endpoint');

    screenshot.saveResponse('test-name', response);

    assertStatusOk(response, 'Should succeed');

    logger.success('Test passed');
    logger.result('Feature Name', true);
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    logger.result('Feature Name', false);
  }
}

async function runAllTests() {
  await testFeature();
  logger.summary();
}

runAllTests();
```

### Add to Master Runner

Edit `run-all-tests.js`:
```javascript
const testSuites = [
  // ... existing tests
  { name: 'My New Module', file: '08-my-test.js' },
];
```

## 📖 Best Practices

1. **Run tests in order** - Some tests depend on data created by previous tests
2. **Check backend status** - Ensure backend is running before testing
3. **Review logs** - Check log files for detailed error information
4. **Clean test data** - Tests create and delete data automatically
5. **Use snapshots** - Review response snapshots for debugging

## 🤝 Contributing

When adding new features to the application:

1. Create corresponding test cases
2. Update this README
3. Run full test suite before committing
4. Include test results in PR

## 📄 License

Same as parent project.

## 🆘 Support

For issues or questions:
1. Check troubleshooting section
2. Review log files in `logs/`
3. Check response snapshots in `screenshots/`
4. Contact development team

---

**Last Updated:** 2026-01-04
**Version:** 1.0.0
