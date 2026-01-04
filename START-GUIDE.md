# Quick Start Guide

## Starting the Application

You have multiple options to start both the backend and frontend servers:

### Option 1: Using Batch File (Windows - Recommended)

Simply double-click `start.bat` or run in Command Prompt:

```cmd
start.bat
```

This will open two separate windows:
- Backend Server (Port 3001)
- Frontend Server (Port 3000)

**To Stop Servers:**
```cmd
stop.bat
```

### Option 2: Using NPM (Cross-Platform)

**First-time setup:**
```bash
npm install
```

**Start both servers:**
```bash
npm start
```

This runs both servers in a single terminal window using `concurrently`.

**Individual servers:**
```bash
# Start only backend
npm run start:backend

# Start only frontend
npm run start:frontend
```

### Option 3: Using Shell Script (Linux/Mac/Git Bash)

```bash
chmod +x start.sh
./start.sh
```

Press `Ctrl+C` to stop both servers.

---

## Access URLs

Once started, you can access:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api-docs (if available)

---

## First-Time Setup

If this is your first time running the application:

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   - Create `.env` file in `backend/` directory
   - Configure database connection and other settings

3. **Initialize database:**
   ```bash
   cd backend
   npm run seed:admin
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

---

## Troubleshooting

### Port Already in Use

If you get an error that port 3001 or 3000 is already in use:

**Windows:**
```cmd
stop.bat
```

**Linux/Mac:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Dependencies Issues

If you encounter dependency errors:

```bash
# Clean install
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
```

---

## Development Tips

- **Backend logs:** Check the Backend Server window for API errors
- **Frontend logs:** Check the Frontend Server window for build/runtime errors
- **Hot reload:** Both servers support hot reload - changes are reflected automatically
- **Database:** PostgreSQL must be running before starting the backend

---

## Build for Production

```bash
# Build both frontend and backend
npm run build

# Or build individually
npm run build:backend
npm run build:frontend
```

---

**Last Updated:** 2026-01-04
