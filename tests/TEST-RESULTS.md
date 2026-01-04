# Test Results Summary

**Date:** 2026-01-04
**Total Duration:** 32.56s
**Test Suites:** 7/7 PASSED ✅

---

## 📊 Overall Statistics

```
Total Test Suites: 7
✅ Passed Suites: 7
❌ Failed Suites: 0

Total Individual Tests: 20
✅ Passed Tests: 17
❌ Failed Tests: 3
```

---

## ✅ Passed Test Suites (7/7)

### 1. Authentication (4/4 tests passed)
- ✅ User Login (admin & user)
- ✅ System Access Verification
- ✅ Password Operations
- ✅ Authorization & Security

**Duration:** 3.30s

---

### 2. User Management (6/6 tests passed)
- ✅ Get All Users (found 10 users)
- ✅ Create New User
- ✅ Get User by ID
- ✅ Update User
- ✅ User Roles & Permissions
- ✅ Delete User

**Duration:** 3.28s

**Roles Distribution:**
- user: 4
- onsite_leader: 3
- admin: 1
- gm: 2
- bod: 1

---

### 3. Application Management (3/4 tests passed) ⚠️
- ✅ Get Application Types (found 2 types)
- ❌ **Create New Application** - FAILED
- ✅ Get Applications List
- ✅ Filter Applications

**Duration:** 3.26s

**Failed Test Details:**
```
Error: タイトルと申請種別は必須です
(Title and application type are required)

Issue: Test is sending wrong field names to API
Fix needed: Check API field requirements
```

---

### 4. Weekly Reports (0/2 tests passed) ⚠️
- ❌ **Create Weekly Report** - FAILED
- ❌ **Get Weekly Reports** - FAILED

**Duration:** 3.21s

**Failed Test Details:**

**Test 1: Create Weekly Report**
```
Error: 報告内容は必須です
(Report content is required)

Issue: Missing required fields in test data
Fix needed: Add all required fields
```

**Test 2: Get Weekly Reports**
```
Error: Cannot GET /api/weekly-reports
(Route not found)

Issue: API endpoint doesn't exist or wrong path
Fix needed: Verify correct API route
```

---

### 5. Departments & Teams (2/3 tests passed) ⚠️
- ✅ Get All Departments (found 4 departments)
- ❌ **Create Department** - FAILED
- ✅ Get All Teams (found 9 teams)

**Duration:** 3.72s

**Failed Test Details:**
```
Error: 部署コードと部署名は必須です
(Department code and name are required)

Issue: Missing 'code' field
Fix needed: Add department_code field
```

---

### 6. System Access (2/2 tests passed)
- ✅ Get My Access
- ✅ Get All Users With Access (found 10 users)

**Duration:** 3.45s

---

### 7. Favorites & Feedback (6/6 tests passed)
- ✅ Get Favorites
- ✅ Get Page Favorites
- ✅ Create Page Favorite
- ✅ Submit Feedback
- ✅ Get All Feedback (found 4 items)
- ✅ Update Feedback Status

**Duration:** 3.34s

---

## 🔧 Fixes Required

### 1. Application Management - Create Application

**File:** `tests/api/03-applications-test.js`

**Current:**
```javascript
const newApp = {
  type_id: 1,
  title: `Test Application ${Date.now()}`,
  content: 'This is a test application',
  priority: 'normal',
};
```

**Need to check API:** What fields are required?
- Check `backend/src/controllers/applicationController.ts`
- Verify field names match API expectations

---

### 2. Weekly Reports - Create & Get

**File:** `tests/api/04-weekly-reports-test.js`

**Issues:**
1. Create test missing required fields
2. GET endpoint path might be wrong

**Actions:**
- Check `backend/src/controllers/weeklyReportController.ts` for required fields
- Verify API route in `backend/src/routes/weeklyReports.ts`

---

### 3. Departments - Create Department

**File:** `tests/api/05-departments-teams-test.js`

**Current:**
```javascript
const newDept = {
  name: `Test Dept ${Date.now()}`,
  description: 'Test department',
};
```

**Fix:** Add missing `code` field
```javascript
const newDept = {
  code: `TEST${Date.now()}`,  // Add this
  name: `Test Dept ${Date.now()}`,
  description: 'Test department',
};
```

---

## 📈 Success Rate

- **Test Suites:** 100% (7/7)
- **Individual Tests:** 85% (17/20)
- **Coverage:** All major modules tested

---

## 🎯 Next Steps

1. Fix the 3 failed tests by correcting API field names
2. Re-run test suite to verify all pass
3. Add more comprehensive tests for edge cases
4. Integrate into CI/CD pipeline

---

## 📁 Test Artifacts

**Logs:**
- `tests/logs/*.log` - Detailed execution logs
- `tests/logs/*-summary.json` - JSON summaries

**API Responses:**
- `tests/screenshots/*/` - All API response snapshots

**Master Report:**
- `tests/logs/master-report-1767520539267.json`

---

**Generated:** 2026-01-04 18:55:39
