import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initDatabase } from './config/database';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import userRoutes from './routes/users';
import departmentRoutes from './routes/departments';
import approverRoutes from './routes/approvers';
import applicationTypeRoutes from './routes/applicationTypes';
import attachmentRoutes from './routes/attachments';
import passwordRoutes from './routes/password';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/approvers', approverRoutes);
app.use('/api/application-types', applicationTypeRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/password', passwordRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '申請・承認管理システム API' });
});

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
