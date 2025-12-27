import { Response } from 'express';
import { getOne, getAll, runQuery } from '../config/database';
import { AuthRequest } from '../middlewares/auth';

// Get all system settings (admin only)
export const getAllSettings = (req: AuthRequest, res: Response): void => {
  try {
    const settings = getAll(`
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM system_settings
      ORDER BY setting_key ASC
    `);

    res.json(settings);
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Get single setting by key
export const getSetting = (req: AuthRequest, res: Response): void => {
  try {
    const { key } = req.params;

    const setting = getOne<{
      id: number;
      setting_key: string;
      setting_value: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM system_settings
      WHERE setting_key = ?
    `, [key]);

    if (!setting) {
      res.status(404).json({ message: '設定が見つかりません' });
      return;
    }

    res.json(setting);
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Get public setting (no auth required - for checking if features are enabled)
export const getPublicSetting = (req: AuthRequest, res: Response): void => {
  try {
    const { key } = req.params;

    // Only allow certain public settings
    const allowedPublicSettings = ['feedback_enabled'];

    if (!allowedPublicSettings.includes(key)) {
      res.status(403).json({ message: 'この設定は公開されていません' });
      return;
    }

    const setting = getOne<{
      setting_key: string;
      setting_value: string;
    }>(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key = ?
    `, [key]);

    if (!setting) {
      res.status(404).json({ message: '設定が見つかりません' });
      return;
    }

    res.json({
      key: setting.setting_key,
      value: setting.setting_value,
      enabled: setting.setting_value === '1'
    });
  } catch (error) {
    console.error('Get public setting error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Update setting (admin only)
export const updateSetting = (req: AuthRequest, res: Response): void => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      res.status(400).json({ message: '設定値は必須です' });
      return;
    }

    // Check if setting exists
    const existingSetting = getOne<{ id: number }>(
      'SELECT id FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (!existingSetting) {
      res.status(404).json({ message: '設定が見つかりません' });
      return;
    }

    // Update setting
    runQuery(`
      UPDATE system_settings
      SET setting_value = ?,
          updated_at = datetime('now')
      WHERE setting_key = ?
    `, [String(value), key]);

    const updatedSetting = getOne(`
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM system_settings
      WHERE setting_key = ?
    `, [key]);

    res.json(updatedSetting);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Create new setting (admin only)
export const createSetting = (req: AuthRequest, res: Response): void => {
  try {
    const { settingKey, settingValue, description } = req.body;

    // Validation
    if (!settingKey || settingValue === undefined) {
      res.status(400).json({ message: '設定キーと設定値は必須です' });
      return;
    }

    // Check if setting already exists
    const existingSetting = getOne(
      'SELECT id FROM system_settings WHERE setting_key = ?',
      [settingKey]
    );

    if (existingSetting) {
      res.status(400).json({ message: 'この設定キーは既に存在します' });
      return;
    }

    // Create setting
    const result = runQuery(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES (?, ?, ?)
    `, [settingKey, String(settingValue), description || null]);

    const newSetting = getOne(`
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM system_settings
      WHERE id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(newSetting);
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};

// Delete setting (admin only)
export const deleteSetting = (req: AuthRequest, res: Response): void => {
  try {
    const { key } = req.params;

    // Prevent deletion of critical settings
    const protectedSettings = ['feedback_enabled'];
    if (protectedSettings.includes(key)) {
      res.status(400).json({ message: 'この設定は削除できません' });
      return;
    }

    // Check if setting exists
    const existingSetting = getOne<{ id: number }>(
      'SELECT id FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (!existingSetting) {
      res.status(404).json({ message: '設定が見つかりません' });
      return;
    }

    // Delete setting
    runQuery('DELETE FROM system_settings WHERE setting_key = ?', [key]);

    res.json({ message: '設定を削除しました' });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
};
