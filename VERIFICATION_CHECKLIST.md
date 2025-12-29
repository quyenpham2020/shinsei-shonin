# Railway Deployment Verification Checklist

## Pre-Verification: Get Your URLs

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Click on your project**
3. **Note the URLs**:
   - Backend: `https://______________.up.railway.app`
   - Frontend: `https://______________.up.railway.app`

---

## 1. Backend Service Verification

### 1.1 Check Service Status
- [ ] Go to Railway → Backend Service
- [ ] Status shows **"Active"** (green dot)
- [ ] No error messages in "Deployments" tab
- [ ] Latest deployment shows **"SUCCESS"**

### 1.2 Check Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `DATABASE_URL` exists (from Postgres)
- [ ] `JWT_SECRET` is set
- [ ] `FRONTEND_URL` is set

### 1.3 Test Backend Endpoints

**Test Health Endpoint** (replace with your backend URL):
```bash
curl https://YOUR-BACKEND.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-12-28T..."}
```

- [ ] Health endpoint returns 200 OK
- [ ] Response includes status and timestamp

**Test Login Endpoint**:
```bash
curl -X POST https://YOUR-BACKEND.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Expected: Returns JSON with `token` field

- [ ] Login endpoint returns 200 OK
- [ ] Response includes auth token

### 1.4 Check Backend Logs
- [ ] Go to Backend Service → Logs
- [ ] Look for: `Database initialized`
- [ ] Look for: `Scheduler initialized:`
- [ ] Look for: `Server is running on port 5000`
- [ ] No error messages about missing modules
- [ ] No database connection errors

---

## 2. Frontend Service Verification

### 2.1 Check Service Status
- [ ] Go to Railway → Frontend Service
- [ ] Status shows **"Active"** (green dot)
- [ ] Latest deployment shows **"SUCCESS"**

### 2.2 Check Environment Variables
- [ ] `VITE_API_URL` points to backend URL

### 2.3 Test Frontend Access

**Open Frontend URL in Browser**:
```
https://YOUR-FRONTEND.up.railway.app
```

- [ ] Page loads without errors
- [ ] Browser shows SSL padlock (🔒)
- [ ] Login page displays correctly
- [ ] No console errors (F12 → Console tab)
- [ ] No "Failed to fetch" errors

---

## 3. Database Verification

### 3.1 Check PostgreSQL Service
- [ ] Go to Railway → Postgres Service
- [ ] Status shows **"Active"**
- [ ] `DATABASE_URL` variable exists

### 3.2 Check Database Connection
- [ ] Backend logs show "Database initialized"
- [ ] No connection errors in backend logs

---

## 4. Application Functionality Tests

### 4.1 Login Test
1. Open frontend URL
2. Try to login with:
   - Email: `admin@example.com`
   - Password: `admin123`

- [ ] Login succeeds
- [ ] Redirects to dashboard
- [ ] User name shows in header

### 4.2 Navigation Test
Click through all menu items:

- [ ] Dashboard loads
- [ ] 申請一覧 (Applications) loads
- [ ] 週次報告 (Weekly Reports) loads
- [ ] マスタ管理 (Master Management) menu expands
- [ ] ユーザー管理 (User Management) loads
- [ ] システム設定 (System Settings) loads

### 4.3 Feature Tests

**Test Weekly Report Reminder**:
- [ ] Go to 週次報告 (Weekly Reports)
- [ ] If no report submitted, banner shows with Vietnamese message
- [ ] Banner text: "Hãy gửi báo cáo tuần ở chỗ dễ nhìn trên web"

**Test System Settings**:
- [ ] Go to システム設定 (System Settings)
- [ ] Email configuration section appears
- [ ] Escalation settings section appears
- [ ] Can save settings without errors

**Test Create Application**:
- [ ] Go to 申請一覧 (Applications)
- [ ] Click 新規申請 (New Application)
- [ ] Form loads correctly
- [ ] Can select application type
- [ ] Can submit (or see validation errors)

---

## 5. Integration Tests

### 5.1 CORS Test
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Try to login
- [ ] API calls go to backend URL
- [ ] No CORS errors in console
- [ ] Requests return 200 OK

### 5.2 Authentication Flow
- [ ] Login works
- [ ] Token is stored (check Application → Local Storage)
- [ ] Refresh page - still logged in
- [ ] Logout works
- [ ] Cannot access pages after logout

---

## 6. Scheduler Verification

### 6.1 Check Scheduler Logs
- [ ] Backend logs show scheduler initialization
- [ ] Shows: "Friday 3 PM JST: Weekly report reminder"
- [ ] Shows: "Saturday 10 AM JST: Escalation to leader"
- [ ] Shows: "Sunday 7 PM JST: Escalation to leader + GM/BOD"
- [ ] No scheduler errors

---

## 7. Performance Tests

### 7.1 Load Time
- [ ] Frontend loads in < 5 seconds
- [ ] API responses in < 2 seconds
- [ ] No timeout errors

### 7.2 Cold Start (if applicable)
- [ ] After 15+ minutes of inactivity
- [ ] First request may be slow (Railway warms up)
- [ ] Subsequent requests are fast

---

## Common Issues & Solutions

### ❌ Frontend loads but shows "Failed to fetch"
**Solution**:
- Check `VITE_API_URL` in frontend variables
- Should point to backend Railway URL
- Redeploy frontend after fixing

### ❌ CORS errors
**Solution**:
- Check `FRONTEND_URL` in backend variables
- Should match frontend Railway URL exactly
- Redeploy backend after fixing

### ❌ "Cannot find module" errors
**Solution**:
- Check build logs
- Ensure `npm install` ran successfully
- Check `node_modules` was created

### ❌ Database connection errors
**Solution**:
- Verify Postgres service is running
- Check `DATABASE_URL` is linked correctly
- Format: `${{Postgres.DATABASE_URL}}`

### ❌ 404 errors on page refresh
**Solution**:
- Frontend routing issue
- Ensure start command includes proper serve configuration
- Use: `npx serve -s dist -l 3000`

---

## Final Verification Summary

### All Green? ✅
If all items are checked:
- ✅ Your Railway deployment is working perfectly!
- ✅ Application is live and accessible
- ✅ All features are functional

### Some Red? ⚠️
If any items failed:
1. Note which tests failed
2. Check Railway logs for errors
3. Verify environment variables
4. Share the error details for help

---

## Next Steps After Verification

1. **Set up custom domain** (optional)
   - Add `vtinagoya.jp.co` in Railway
   - Configure DNS records

2. **Configure email settings**
   - Go to System Settings
   - Add SMTP credentials
   - Test weekly report reminders

3. **Backup strategy**
   - Railway provides automatic Postgres backups
   - Consider exporting data periodically

4. **Monitor deployment**
   - Check Railway logs regularly
   - Set up uptime monitoring (optional)

---

## Quick Test Commands

Replace `YOUR-BACKEND-URL` and `YOUR-FRONTEND-URL` with your actual URLs:

```bash
# Test backend health
curl https://YOUR-BACKEND-URL/api/health

# Test login
curl -X POST https://YOUR-BACKEND-URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Check frontend loads
curl -I https://YOUR-FRONTEND-URL

# Full verification (Linux/Mac)
bash verify-deployment.sh
```

---

**Deployment Status**: [ ] Verified ✅ | [ ] Issues Found ⚠️ | [ ] Not Tested ❌

**Date Verified**: __________________

**Verified By**: __________________
