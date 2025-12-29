# Deploy to Render - Quick Guide

## Method 1: One-Click Deploy (Easiest)

1. Click this button: [Deploy to Render](https://render.com/deploy?repo=https://github.com/quyenpham2020/shinsei-shonin)

2. In Render:
   - Login with GitHub
   - Select branch: **main**
   - Blueprint name: **vtinagoya**
   - Click **"Apply"**

3. Wait 3-5 minutes

4. Get URLs from Render Dashboard

## Method 2: Manual Setup

If the button doesn't work, create services manually:

### Step 1: Create Database

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Name: `shinsei-shonin-db`
4. Plan: **Free**
5. Click **"Create Database"**

### Step 2: Create Backend Service

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repo: `quyenpham2020/shinsei-shonin`
3. Settings:
   - **Name**: `shinsei-shonin-backend`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Root Directory**: `/` (leave empty)
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`

4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=[Link from Postgres database]
   JWT_SECRET=[Auto-generated or custom]
   FRONTEND_URL=https://shinsei-shonin-frontend.onrender.com
   ```

5. Click **"Create Web Service"**

### Step 3: Create Frontend Service

1. Click **"New +"** → **"Static Site"**
2. Connect same GitHub repo
3. Settings:
   - **Name**: `shinsei-shonin-frontend`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Root Directory**: `/` (leave empty)
   - **Build Command**: `cd frontend && npm install && VITE_API_URL=https://shinsei-shonin-backend.onrender.com npm run build`
   - **Publish Directory**: `frontend/dist`

4. Click **"Create Static Site"**

### Step 4: Update Environment Variables

After both services are created:

1. Go to backend service → Environment
2. Update `FRONTEND_URL` to actual frontend URL

3. Go to frontend service → Redeploy

## Verification

After deployment:

1. Open frontend URL
2. Should see login page
3. Login with:
   - Email: admin@example.com
   - Password: admin123

## Troubleshooting

### Build fails
- Check build logs
- Ensure `main` branch has all files
- Check package.json exists in both backend/frontend

### 404 errors
- Wait 1-2 minutes for cold start
- Check service is "Live" not "Building"

### Database errors
- Verify DATABASE_URL is linked
- Check Postgres service is running
