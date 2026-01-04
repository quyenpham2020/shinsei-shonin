# Quick Start Guide - Test Suite

## 🚀 Chạy Test Nhanh (Quick Test Run)

### 1. Đảm bảo Backend đang chạy

```bash
# Terminal 1: Khởi động backend
cd backend
npm run dev

# Đợi cho đến khi thấy message:
# "Server is running on port 3001"
```

### 2. Chạy toàn bộ Test Suite

```bash
# Terminal 2: Chạy tất cả tests
cd tests
node run-all-tests.js
```

**Kết quả mong đợi:**
```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         SHINSEI-SHONIN TEST SUITE                             ║
║                         Comprehensive API Testing                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

✅ PASSED - Authentication
✅ PASSED - User Management
✅ PASSED - Application Management
✅ PASSED - Weekly Reports
✅ PASSED - Departments & Teams
✅ PASSED - System Access
✅ PASSED - Favorites & Feedback

Total Tests: 42
Passed: 42
Failed: 0
```

## 📝 Chạy Test Từng Module

### Authentication Test
```bash
cd tests
node api/01-auth-test.js
```

**Test cases:**
- ✅ Admin login
- ✅ User login
- ✅ Invalid credentials
- ✅ System access verification
- ✅ Password operations
- ✅ Authorization & security

### User Management Test
```bash
cd tests
node api/02-users-test.js
```

**Test cases:**
- ✅ Get all users
- ✅ Create new user
- ✅ Get user by ID
- ✅ Update user
- ✅ User roles verification
- ✅ Delete user

### Application Management Test
```bash
cd tests
node api/03-applications-test.js
```

**Test cases:**
- ✅ Get application types
- ✅ Create application
- ✅ List applications
- ✅ Get application details
- ✅ Approve application
- ✅ Filter applications

### Weekly Reports Test
```bash
cd tests
node api/04-weekly-reports-test.js
```

**Test cases:**
- ✅ Create weekly report
- ✅ Get all reports
- ✅ Get report details
- ✅ Update report
- ✅ Generate AI overview
- ✅ Delete report

### Departments & Teams Test
```bash
cd tests
node api/05-departments-teams-test.js
```

**Test cases:**
- ✅ Get departments
- ✅ Create department
- ✅ Get teams
- ✅ Create team
- ✅ Update team
- ✅ Delete team/department

### System Access Test
```bash
cd tests
node api/06-system-access-test.js
```

**Test cases:**
- ✅ Get my access
- ✅ Get all users with access
- ✅ Bulk update access
- ✅ Access restriction verification

### Favorites & Feedback Test
```bash
cd tests
node api/07-favorites-feedback-test.js
```

**Test cases:**
- ✅ Get favorites
- ✅ Get page favorites
- ✅ Create page favorite
- ✅ Submit feedback
- ✅ Get all feedback
- ✅ Update feedback status

## 📊 Xem Kết Quả Test

### 1. Console Output
Test sẽ hiển thị kết quả trực tiếp trên console với màu sắc:
- 🟢 **Xanh lá**: Test passed
- 🔴 **Đỏ**: Test failed
- 🔵 **Xanh dương**: Information
- 🟡 **Vàng**: Warning

### 2. Log Files
Chi tiết test được lưu trong `tests/logs/`:

```bash
# Xem log file mới nhất
cd tests/logs
ls -lt | head

# Xem nội dung log
cat Authentication-[timestamp].log
```

### 3. JSON Summary
Tóm tắt kết quả dạng JSON:

```bash
# Xem summary của một module
cat tests/logs/Authentication-summary.json

# Xem master report (toàn bộ test suite)
cat tests/logs/master-report-[timestamp].json
```

### 4. API Response Snapshots
Tất cả API responses được lưu trong `tests/screenshots/`:

```bash
# Xem response của authentication test
ls tests/screenshots/authentication/

# Xem một response cụ thể
cat tests/screenshots/authentication/admin-login-[timestamp].json
```

## 🔍 Debug Test Failures

### Khi test fail:

1. **Kiểm tra console output** - Xem error message chi tiết
2. **Đọc log file** - Có thông tin đầy đủ hơn
3. **Kiểm tra snapshot** - Xem API response thực tế
4. **Verify backend** - Đảm bảo backend đang chạy đúng

### Example debug flow:

```bash
# 1. Test failed
node api/01-auth-test.js
# ❌ TEST FAILED: User Login

# 2. Xem log chi tiết
cat logs/Authentication-[timestamp].log

# 3. Xem API response
cat screenshots/authentication/admin-login-[timestamp].json

# 4. Kiểm tra backend
curl http://localhost:3001/api/health
```

## 🧹 Dọn dẹp Test Data

### Xóa logs và screenshots cũ:

```bash
# Sử dụng npm script
cd tests
npm run clean

# Hoặc manual
rm -rf logs/* screenshots/*
```

## 📋 Checklist Trước Khi Chạy Test

- [ ] Backend server đang chạy (port 3001)
- [ ] Database đã được initialize
- [ ] Admin user tồn tại (admin/admin)
- [ ] Test user tồn tại (quyet/quyet)
- [ ] Có kết nối internet (nếu test AI features)

## 💡 Tips

### 1. Chạy test khi develop feature mới:
```bash
# Chạy test liên quan đến feature
node api/02-users-test.js  # Nếu làm user management

# Sau khi pass, chạy toàn bộ suite
node run-all-tests.js
```

### 2. CI/CD Integration:
```bash
# Trong pipeline, chạy:
cd backend && npm run dev &
sleep 5  # Đợi backend khởi động
cd ../tests && node run-all-tests.js
```

### 3. Test trước khi commit:
```bash
# Tạo alias trong ~/.bashrc hoặc ~/.zshrc
alias test-shinsei="cd /path/to/shinsei-shonin/tests && node run-all-tests.js"

# Sau đó chỉ cần:
test-shinsei
```

## 🎯 Next Steps

Sau khi chạy test thành công:

1. ✅ Review kết quả trong master report
2. ✅ Check log files để hiểu flow chi tiết
3. ✅ Xem API snapshots để verify data
4. ✅ Sử dụng test suite này mỗi khi:
   - Thêm feature mới
   - Fix bug
   - Refactor code
   - Before deploy

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra backend logs
2. Kiểm tra test logs
3. Verify database data
4. Contact development team

---

**Last Updated:** 2026-01-04
