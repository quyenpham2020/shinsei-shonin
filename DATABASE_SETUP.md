# Database Setup Guide

## PostgreSQL Setup

This application uses **PostgreSQL** for both local development and production (Render).

### 1. Install PostgreSQL

#### Windows:
1. Download from: https://www.postgresq l.org/download/windows/
2. Run installer
3. Default port: `5432`
4. Remember your password for `postgres` user

#### Mac (using Homebrew):
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Access PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE shinsei_shonin;

# Create user (optional, or use postgres user)
CREATE USER shinsei_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE shinsei_shonin TO shinsei_admin;

# Exit psql
\q
```

### 3. Configure Environment Variables

Create `.env` file in `backend/` directory:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shinsei_shonin
JWT_SECRET=shinsei-shonin-demo-secret-key
FRONTEND_URL=http://localhost:3000
```

### 4. Database Connection Information

#### Local Development

| Parameter | Value |
|-----------|-------|
| **Host** | localhost |
| **Port** | 5432 |
| **Database** | shinsei_shonin |
| **Username** | postgres |
| **Password** | postgres (or your password) |
| **Connection String** | postgresql://postgres:postgres@localhost:5432/shinsei_shonin |

#### Production (Render)

Render automatically provides `DATABASE_URL` environment variable.

### 5. Access Database

#### Using psql (Command Line):
```bash
psql -U postgres -d shinsei_shonin
```

#### Using pgAdmin (GUI):
1. Download: https://www.pgadmin.org/download/
2. Install and open
3. Add new server:
   - Name: Local Shinsei
   - Host: localhost
   - Port: 5432
   - Database: shinsei_shonin
   - Username: postgres
   - Password: your_password

#### Using DBeaver (GUI):
1. Download: https://dbeaver.io/download/
2. Install and open
3. Database → New Database Connection
4. Select PostgreSQL
5. Enter connection details above

#### Using VS Code Extension:
1. Install "PostgreSQL" extension by Chris Kolkman
2. Click PostgreSQL icon in sidebar
3. Add connection with details above

### 6. Run Application

The application will automatically:
1. Connect to PostgreSQL
2. Create all tables (if not exist)
3. Be ready to use

```bash
cd backend
npm install
npm run dev
```

### 7. Seed Initial Data

```bash
cd backend
npm run seed
```

This will create:
- Admin user: `admin@example.com` / `admin123`
- Sample departments
- Sample application types
- Sample users

### 8. Common PostgreSQL Commands

```sql
-- List all databases
\l

-- Connect to database
\c shinsei_shonin

-- List all tables
\dt

-- View table structure
\d users

-- View all users
SELECT * FROM users;

-- Count records
SELECT COUNT(*) FROM users;

-- Drop database (careful!)
DROP DATABASE shinsei_shonin;

-- Quit psql
\q
```

### 9. Troubleshooting

#### Connection refused:
- Check PostgreSQL is running: `sudo systemctl status postgresql` (Linux)
- Check port 5432 is not blocked

#### Authentication failed:
- Update password in .env file
- Reset postgres password: `ALTER USER postgres PASSWORD 'new_password';`

#### Database doesn't exist:
- Create manually: `CREATE DATABASE shinsei_shonin;`

#### Port already in use:
- Change PORT in .env to different value (e.g., 3002)

### 10. Production Database (Render)

On Render:
1. Database is automatically created
2. `DATABASE_URL` environment variable is provided
3. Connection uses SSL
4. Database name: `shinsei_shonin`
5. Plan: Free (10GB storage, max 1 million rows)

To access Render database:
1. Go to Render Dashboard
2. Click on **shinsei-shonin-db**
3. Copy "External Database URL"
4. Use with pgAdmin/DBeaver/psql

Example connection string:
```
postgresql://shinsei_shonin_user:password@dpg-xxx.oregon-postgres.render.com/shinsei_shonin
```

### 11. Backup and Restore

#### Backup:
```bash
pg_dump -U postgres shinsei_shonin > backup.sql
```

#### Restore:
```bash
psql -U postgres shinsei_shonin < backup.sql
```

#### Backup from Render:
```bash
pg_dump -h dpg-xxx.oregon-postgres.render.com -U shinsei_shonin_user shinsei_shonin > render_backup.sql
```
