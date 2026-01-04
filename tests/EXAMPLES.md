# Test Examples & Screenshots

## 📸 Ví dụ Output từng Test

### 1. Authentication Test

**Command:**
```bash
node api/01-auth-test.js
```

**Output:**
```
================================================================================
TEST MODULE: Authentication
Started at: 2026/1/4 14:23:14
================================================================================

--------------------------------------------------------------------------------
TEST 1: User Login
--------------------------------------------------------------------------------

[Step 1] Login as admin user
ℹ️  Response saved to: C:\Work\shinsei-shonin\tests\screenshots\authentication\admin-login-1767504194871.json
✅ Admin logged in: admin (g7)
ℹ️  Token: eyJhbGciOiJIUzI1NiIs...

[Step 2] Login as regular user
ℹ️  Response saved to: C:\Work\shinsei-shonin\tests\screenshots\authentication\user-login-1767504194937.json
✅ User logged in: quyet (g7)
ℹ️  Token: eyJhbGciOiJIUzI1NiIs...

[Step 3] Test invalid credentials
✅ Invalid login correctly rejected
✅ TEST PASSED: User Login

--------------------------------------------------------------------------------
TEST 2: System Access Verification
--------------------------------------------------------------------------------

[Step 1] Get admin system access
✅ Admin has access to: All systems (admin)

[Step 2] Get regular user system access
✅ User has access to: shinsei-shonin, weekly-report
✅ TEST PASSED: System Access Verification

================================================================================
TEST SUMMARY
================================================================================
Total Tests: 4
Passed: 4
Failed: 0
Duration: 3.33s
Log file: C:\Work\shinsei-shonin\tests\logs\Authentication-1767504194679.log
================================================================================
```

**API Response Example (admin-login.json):**
```json
{
  "status": 200,
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 11,
      "employeeId": "admin",
      "name": "admin",
      "email": "admin",
      "department": "g7",
      "role": "admin",
      "mustChangePassword": false
    }
  }
}
```

---

### 2. User Management Test

**Command:**
```bash
node api/02-users-test.js
```

**Output:**
```
================================================================================
TEST MODULE: User-Management
================================================================================

TEST 1: Get All Users
[Step 1] Fetch all users from database
✅ Found 25 users in system
ℹ️  Sample users:
  - admin: admin (admin) - g7
  - quyet: quyet (user) - g7
  - user1: Test User 1 (user) - g1
  - user2: Test User 2 (approver) - g2
  - user3: Test User 3 (onsite_leader) - g3

TEST 2: Create New User
[Step 1] Create new user
ℹ️  Creating user: {
  "employeeId": "test_1767504200000",
  "name": "Test User",
  "email": "test_1767504200000@example.com",
  "password": "password123",
  "department": "g7",
  "role": "user"
}
✅ User created successfully with ID: 42
✅ TEST PASSED: Create New User

TEST 3: Get User by ID
[Step 1] Fetch user with ID: 42
✅ User details retrieved: Test User
ℹ️  User info: {
  "id": 42,
  "employee_id": "test_1767504200000",
  "name": "Test User",
  "email": "test_1767504200000@example.com",
  "department": "g7",
  "role": "user"
}

TEST 4: Update User
[Step 1] Update user 42
✅ User updated successfully
[Step 2] Verify update
✅ Update verified successfully

TEST SUMMARY
Total Tests: 6
Passed: 6
Failed: 0
Duration: 2.54s
```

---

### 3. Application Management Test

**Output:**
```
TEST 1: Get Application Types
✅ Found 3 application types
ℹ️  Available types:
  - 1: 休暇申請
  - 2: 経費精算
  - 3: 出張申請

TEST 2: Create New Application
✅ Application created with ID: 123

TEST 3: Get Applications List
✅ Found 15 applications
ℹ️  Recent applications:
  - [123] Test Application 1767504300000 - Status: pending
  - [122] 休暇申請 - Status: approved
  - [121] 経費精算 - Status: pending
```

---

### 4. Weekly Reports Test

**Output:**
```
TEST 1: Create Weekly Report
✅ Weekly report created with ID: 45

TEST 2: Get Weekly Reports
✅ Found 12 weekly reports
ℹ️  Recent reports:
  - [45] Week: 2025-01-06 - Test weekly report summary
  - [44] Week: 2024-12-30 - Weekly summary
  - [43] Week: 2024-12-23 - Progress report

TEST 5: Generate AI Overview
✅ AI overview generated successfully
ℹ️  Overview: This week showed good progress on testing framework...
```

---

### 5. System Access Test

**Output:**
```
TEST 1: Get My System Access

[Step 1] Get admin system access
✅ Admin access: All systems (admin)

[Step 2] Get user system access
✅ User access: shinsei-shonin, weekly-report

TEST 2: Get All Users With Access
✅ Found 25 users
ℹ️  Sample users with access:
  - admin: admin - [All Systems]
  - quyet: quyet - [shinsei-shonin, weekly-report]
  - user1: User 1 - [shinsei-shonin]
  - user2: User 2 - [weekly-report]

TEST 3: Bulk Update System Access
[Step 1] Get current user access
ℹ️  Current systems: shinsei-shonin, weekly-report

[Step 2] Update system access
✅ System access updated successfully

[Step 3] Verify updated access
ℹ️  Updated systems: shinsei-shonin, weekly-report
✅ TEST PASSED: Bulk Update System Access
```

---

### 6. Master Test Runner

**Command:**
```bash
node run-all-tests.js
```

**Output:**
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         SHINSEI-SHONIN TEST SUITE                             ║
║                         Comprehensive API Testing                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝
Started at: 2026/1/4 14:25:00

================================================================================
Running: 01-auth-test.js
================================================================================
[... Authentication tests output ...]

================================================================================
Running: 02-users-test.js
================================================================================
[... User management tests output ...]

[... continues for all test suites ...]

╔═══════════════════════════════════════════════════════════════════════════════╗
║                            TEST EXECUTION SUMMARY                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Test Suites:
  ✅ PASSED - Authentication
  ✅ PASSED - User Management
  ✅ PASSED - Application Management
  ✅ PASSED - Weekly Reports
  ✅ PASSED - Departments & Teams
  ✅ PASSED - System Access
  ✅ PASSED - Favorites & Feedback

Overall Statistics:
  Total Test Suites: 7
  Passed Suites: 7
  Failed Suites: 0

  Total Individual Tests: 42
  Passed Tests: 42
  Failed Tests: 0

  Total Duration: 24.35s
  Average per Suite: 3.48s

Master report saved to: tests/logs/master-report-1767504324567.json

Logs and screenshots available in:
  - Logs: C:\Work\shinsei-shonin\tests\logs
  - Screenshots: C:\Work\shinsei-shonin\tests\screenshots

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          ✅ ALL TESTS PASSED ✅                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📁 File Structure After Running Tests

```
tests/
├── logs/
│   ├── Authentication-1767504194679.log
│   ├── Authentication-summary.json
│   ├── User-Management-1767504198234.log
│   ├── User-Management-summary.json
│   ├── Application-Management-1767504202567.log
│   ├── Application-Management-summary.json
│   ├── Weekly-Reports-1767504208901.log
│   ├── Weekly-Reports-summary.json
│   ├── Departments-Teams-1767504214234.log
│   ├── Departments-Teams-summary.json
│   ├── System-Access-1767504218567.log
│   ├── System-Access-summary.json
│   ├── Favorites-Feedback-1767504222890.log
│   ├── Favorites-Feedback-summary.json
│   └── master-report-1767504324567.json
│
└── screenshots/
    ├── authentication/
    │   ├── admin-login-1767504194871.json
    │   ├── user-login-1767504194937.json
    │   ├── admin-system-access-1767504195963.json
    │   └── user-system-access-1767504195967.json
    │
    ├── user-management/
    │   ├── get-all-users-1767504198345.json
    │   ├── create-user-1767504198678.json
    │   ├── get-user-by-id-1767504199012.json
    │   └── update-user-1767504199345.json
    │
    ├── application-management/
    │   ├── get-application-types-1767504202678.json
    │   ├── create-application-1767504203012.json
    │   └── approve-application-1767504204567.json
    │
    └── [other modules...]
```

---

## 📊 JSON Summary Example

**master-report.json:**
```json
{
  "timestamp": "2026-01-04T05:25:24.567Z",
  "duration": "24.35",
  "totalSuites": 7,
  "passedSuites": 7,
  "failedSuites": 0,
  "totalTests": 42,
  "passedTests": 42,
  "failedTests": 0,
  "suiteResults": [
    {
      "name": "Authentication",
      "file": "01-auth-test.js",
      "success": true,
      "exitCode": 0
    },
    {
      "name": "User Management",
      "file": "02-users-test.js",
      "success": true,
      "exitCode": 0
    }
    // ... more suites
  ]
}
```

**Authentication-summary.json:**
```json
{
  "moduleName": "Authentication",
  "timestamp": "2026-01-04T05:23:17.123Z",
  "duration": "3.33",
  "total": 4,
  "passed": 4,
  "failed": 0,
  "results": [
    {
      "name": "User Login",
      "passed": true,
      "details": {
        "adminToken": "Generated",
        "userToken": "Generated"
      },
      "timestamp": "2026-01-04T05:23:15.234Z"
    },
    {
      "name": "System Access Verification",
      "passed": true,
      "details": {
        "adminSystems": [],
        "userSystems": ["shinsei-shonin", "weekly-report"]
      },
      "timestamp": "2026-01-04T05:23:16.456Z"
    }
    // ... more results
  ]
}
```

---

## 🎯 Use Cases

### Use Case 1: Verify Feature After Development

```bash
# Sau khi implement user management feature
node api/02-users-test.js

# Check output
✅ All user CRUD operations working
✅ Roles and permissions verified
✅ No regressions detected
```

### Use Case 2: Before Deployment

```bash
# Run full test suite
node run-all-tests.js

# Review master report
cat logs/master-report-*.json

# All passed? Deploy!
```

### Use Case 3: Debugging Bug

```bash
# Run specific module
node api/03-applications-test.js

# Test fails? Check details
cat logs/Application-Management-*.log
cat screenshots/application-management/create-application-*.json

# Fix bug and re-run
node api/03-applications-test.js
```

---

**Last Updated:** 2026-01-04
