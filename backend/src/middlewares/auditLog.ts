import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { logAction } from '../services/auditService';

/**
 * Middleware to log user actions
 * Usage: router.post('/applications', auth, auditLog('create', 'application'), createApplication);
 */
export function auditLog(action: string, resourceType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Store original res.json to capture response
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Log action after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Extract resource ID from response or request
        let resourceId = data?.id || data?.data?.id || req.params?.id;

        // Build description based on action
        let description = `${action} ${resourceType}`;
        if (data?.title || data?.data?.title) {
          description += `: ${data.title || data.data.title}`;
        } else if (data?.name || data?.data?.name) {
          description += `: ${data.name || data.data.name}`;
        }

        // Log action asynchronously (don't wait)
        logAction({
          userId: req.user.id,
          employeeId: req.user.employeeId,
          username: req.user.name,
          action,
          resourceType,
          resourceId: resourceId?.toString(),
          description,
          oldValues: req.body?._oldValues, // Can be set by controllers
          newValues: data,
          req,
        }).catch((error) => {
          console.error('Error in audit log middleware:', error);
        });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Helper function for controllers to manually log actions
 */
export async function logControllerAction(
  req: AuthRequest,
  action: string,
  resourceType: string,
  resourceId?: string,
  description?: string,
  oldValues?: any,
  newValues?: any
): Promise<void> {
  if (!req.user) return;

  await logAction({
    userId: req.user.id,
    employeeId: req.user.employeeId,
    username: req.user.name,
    action,
    resourceType,
    resourceId,
    description,
    oldValues,
    newValues,
    req,
  });
}
