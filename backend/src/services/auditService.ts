import { Request } from 'express';
import geoip from 'geoip-lite';
import UserAgent from 'user-agents';
import { runQuery } from '../config/database';

interface ClientInfo {
  ipAddress: string;
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

/**
 * Extract client information from request
 */
export function getClientInfo(req: Request): ClientInfo {
  // Get IP address (handle proxy/cloudflare)
  const ipAddress = (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    req.ip ||
    '0.0.0.0'
  ).toString().split(',')[0].trim();

  // Get user agent
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Parse user agent
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Unknown';

  try {
    const uaString = userAgent.toLowerCase();

    // Detect browser
    if (uaString.includes('edg')) browser = 'Edge';
    else if (uaString.includes('chrome')) browser = 'Chrome';
    else if (uaString.includes('firefox')) browser = 'Firefox';
    else if (uaString.includes('safari')) browser = 'Safari';
    else if (uaString.includes('opera')) browser = 'Opera';

    // Detect OS
    if (uaString.includes('windows')) os = 'Windows';
    else if (uaString.includes('mac')) os = 'macOS';
    else if (uaString.includes('linux')) os = 'Linux';
    else if (uaString.includes('android')) os = 'Android';
    else if (uaString.includes('ios') || uaString.includes('iphone') || uaString.includes('ipad')) os = 'iOS';

    // Detect device type
    if (uaString.includes('mobile')) device = 'Mobile';
    else if (uaString.includes('tablet')) device = 'Tablet';
    else device = 'Desktop';
  } catch (e) {
    console.error('Error parsing user agent:', e);
  }

  // Get geolocation
  let country, region, city, timezone;
  try {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      country = geo.country;
      region = geo.region;
      city = geo.city;
      timezone = geo.timezone;
    }
  } catch (e) {
    console.error('Error looking up geolocation:', e);
  }

  return {
    ipAddress,
    userAgent,
    browser,
    os,
    device,
    country,
    region,
    city,
    timezone,
  };
}

/**
 * Log login attempt
 */
export async function logLogin(params: {
  userId: number;
  employeeId: string;
  username: string;
  status: 'success' | 'failed';
  failureReason?: string;
  req: Request;
}): Promise<void> {
  const { userId, employeeId, username, status, failureReason, req } = params;
  const clientInfo = getClientInfo(req);

  try {
    await runQuery(
      `INSERT INTO login_logs (
        user_id, employee_id, username, ip_address, user_agent,
        browser, os, device, country, region, city, timezone,
        login_status, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        userId,
        employeeId,
        username,
        clientInfo.ipAddress,
        clientInfo.userAgent,
        clientInfo.browser,
        clientInfo.os,
        clientInfo.device,
        clientInfo.country,
        clientInfo.region,
        clientInfo.city,
        clientInfo.timezone,
        status,
        failureReason,
      ]
    );
  } catch (error) {
    console.error('Error logging login:', error);
  }
}

/**
 * Log user action
 */
export async function logAction(params: {
  userId: number;
  employeeId: string;
  username: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  req: Request;
}): Promise<void> {
  const { userId, employeeId, username, action, resourceType, resourceId, description, oldValues, newValues, req } = params;
  const clientInfo = getClientInfo(req);

  try {
    await runQuery(
      `INSERT INTO audit_logs (
        user_id, employee_id, username, action, resource_type, resource_id,
        description, ip_address, user_agent, old_values, new_values
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        employeeId,
        username,
        action,
        resourceType,
        resourceId,
        description,
        clientInfo.ipAddress,
        clientInfo.userAgent,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ]
    );
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

/**
 * Log password change
 */
export async function logPasswordChange(params: {
  userId: number;
  employeeId: string;
  username: string;
  changeType: 'reset' | 'change' | 'force_reset';
  changedBy?: number;
  changedByName?: string;
  isForced?: boolean;
  req: Request;
}): Promise<void> {
  const { userId, employeeId, username, changeType, changedBy, changedByName, isForced, req } = params;
  const clientInfo = getClientInfo(req);

  try {
    await runQuery(
      `INSERT INTO password_change_logs (
        user_id, employee_id, username, change_type, changed_by, changed_by_name,
        ip_address, user_agent, is_forced
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        employeeId,
        username,
        changeType,
        changedBy || userId,
        changedByName,
        clientInfo.ipAddress,
        clientInfo.userAgent,
        isForced || false,
      ]
    );
  } catch (error) {
    console.error('Error logging password change:', error);
  }
}
