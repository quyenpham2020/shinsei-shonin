import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getAll, query } from '../config/database';

/**
 * Get login logs
 */
export const getLoginLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 100, offset = 0, userId, status, startDate, endDate } = req.query;

    let sql = `
      SELECT * FROM login_logs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by user ID
    if (userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    // Filter by status
    if (status) {
      sql += ` AND login_status = $${paramIndex++}`;
      params.push(status);
    }

    // Filter by date range
    if (startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const logs = await getAll(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM login_logs WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (userId) {
      countSql += ` AND user_id = $${countParamIndex++}`;
      countParams.push(userId);
    }

    if (status) {
      countSql += ` AND login_status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (startDate) {
      countSql += ` AND created_at >= $${countParamIndex++}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ` AND created_at <= $${countParamIndex++}`;
      countParams.push(endDate);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: parseInt(offset.toString()) + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({ message: 'ログの取得に失敗しました' });
  }
};

/**
 * Get audit logs (user actions)
 */
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 100, offset = 0, userId, action, resourceType, startDate, endDate } = req.query;

    let sql = `
      SELECT * FROM audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by user ID
    if (userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    // Filter by action
    if (action) {
      sql += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    // Filter by resource type
    if (resourceType) {
      sql += ` AND resource_type = $${paramIndex++}`;
      params.push(resourceType);
    }

    // Filter by date range
    if (startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const logs = await getAll(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (userId) {
      countSql += ` AND user_id = $${countParamIndex++}`;
      countParams.push(userId);
    }

    if (action) {
      countSql += ` AND action = $${countParamIndex++}`;
      countParams.push(action);
    }

    if (resourceType) {
      countSql += ` AND resource_type = $${countParamIndex++}`;
      countParams.push(resourceType);
    }

    if (startDate) {
      countSql += ` AND created_at >= $${countParamIndex++}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ` AND created_at <= $${countParamIndex++}`;
      countParams.push(endDate);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: parseInt(offset.toString()) + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'ログの取得に失敗しました' });
  }
};

/**
 * Get password change logs
 */
export const getPasswordChangeLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 100, offset = 0, userId, changeType, startDate, endDate } = req.query;

    let sql = `
      SELECT * FROM password_change_logs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by user ID
    if (userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    // Filter by change type
    if (changeType) {
      sql += ` AND change_type = $${paramIndex++}`;
      params.push(changeType);
    }

    // Filter by date range
    if (startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const logs = await getAll(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM password_change_logs WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (userId) {
      countSql += ` AND user_id = $${countParamIndex++}`;
      countParams.push(userId);
    }

    if (changeType) {
      countSql += ` AND change_type = $${countParamIndex++}`;
      countParams.push(changeType);
    }

    if (startDate) {
      countSql += ` AND created_at >= $${countParamIndex++}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ` AND created_at <= $${countParamIndex++}`;
      countParams.push(endDate);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: parseInt(offset.toString()) + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching password change logs:', error);
    res.status(500).json({ message: 'ログの取得に失敗しました' });
  }
};

/**
 * Get all audit log types combined (for admin dashboard)
 */
export const getAllAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;

    // Get recent login logs
    const loginLogs = await getAll(
      'SELECT *, \'login\' as log_type FROM login_logs ORDER BY created_at DESC LIMIT $1',
      [Math.floor(Number(limit) / 3)]
    );

    // Get recent audit logs
    const auditLogs = await getAll(
      'SELECT *, \'action\' as log_type FROM audit_logs ORDER BY created_at DESC LIMIT $1',
      [Math.floor(Number(limit) / 3)]
    );

    // Get recent password change logs
    const passwordLogs = await getAll(
      'SELECT *, \'password\' as log_type FROM password_change_logs ORDER BY created_at DESC LIMIT $1',
      [Math.floor(Number(limit) / 3)]
    );

    // Combine and sort by date
    const allLogs = [...loginLogs, ...auditLogs, ...passwordLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({
      logs: allLogs.slice(0, Number(limit)),
    });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({ message: 'ログの取得に失敗しました' });
  }
};
