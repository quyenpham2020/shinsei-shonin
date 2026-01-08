import { runQuery, getOne } from '../config/database';

/**
 * Category Management Service
 * Handles newsfeed categories CRUD operations
 */

export interface Category {
  id: number;
  name: string;
  name_en: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithPostCount extends Category {
  post_count: number;
}

export interface CreateCategoryInput {
  name: string;
  name_en?: string;
  icon?: string;
  color?: string;
  display_order?: number;
  created_by?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  name_en?: string;
  icon?: string;
  color?: string;
  display_order?: number;
  is_active?: boolean;
}

/**
 * Get all active categories (Public)
 * @returns Array of active categories with post counts
 */
export async function getActiveCategories(): Promise<CategoryWithPostCount[]> {
  const result = await runQuery<CategoryWithPostCount>(
    `SELECT
      c.*,
      COUNT(p.id) as post_count
    FROM newsfeed_categories c
    LEFT JOIN newsfeed_posts p ON c.id = p.category_id
    WHERE c.is_active = true
    GROUP BY c.id
    ORDER BY c.display_order ASC`,
    []
  );

  return result.rows;
}

/**
 * Get all categories including inactive (Admin only)
 * @returns Array of all categories with post counts
 */
export async function getAllCategories(): Promise<CategoryWithPostCount[]> {
  const result = await runQuery<CategoryWithPostCount>(
    `SELECT
      c.*,
      COUNT(p.id) as post_count
    FROM newsfeed_categories c
    LEFT JOIN newsfeed_posts p ON c.id = p.category_id
    GROUP BY c.id
    ORDER BY c.display_order ASC`,
    []
  );

  return result.rows;
}

/**
 * Get category by ID
 * @param categoryId The category ID
 * @returns Category or null if not found
 */
export async function getCategoryById(
  categoryId: number
): Promise<Category | null> {
  try {
    return await getOne<Category>(
      'SELECT * FROM newsfeed_categories WHERE id = $1',
      [categoryId]
    );
  } catch (error) {
    return null;
  }
}

/**
 * Create new category (Admin only)
 * @param input Category data
 * @returns Created category
 */
export async function createCategory(
  input: CreateCategoryInput
): Promise<Category> {
  // Get max display_order if not provided
  let displayOrder = input.display_order;
  if (displayOrder === undefined) {
    const maxOrderResult = await runQuery<{ max: number | null }>(
      'SELECT COALESCE(MAX(display_order), 0) as max FROM newsfeed_categories',
      []
    );
    displayOrder = (maxOrderResult.rows[0]?.max || 0) + 1;
  }

  const result = await runQuery<Category>(
    `INSERT INTO newsfeed_categories (name, name_en, icon, color, display_order, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      input.name,
      input.name_en || null,
      input.icon || null,
      input.color || null,
      displayOrder,
      input.created_by || null,
    ]
  );

  return result.rows[0];
}

/**
 * Update category (Admin only)
 * @param categoryId The category ID
 * @param input Updated data
 * @returns Updated category or null if not found
 */
export async function updateCategory(
  categoryId: number,
  input: UpdateCategoryInput
): Promise<Category | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.name_en !== undefined) {
    updates.push(`name_en = $${paramIndex++}`);
    values.push(input.name_en);
  }
  if (input.icon !== undefined) {
    updates.push(`icon = $${paramIndex++}`);
    values.push(input.icon);
  }
  if (input.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(input.color);
  }
  if (input.display_order !== undefined) {
    updates.push(`display_order = $${paramIndex++}`);
    values.push(input.display_order);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.is_active);
  }

  if (updates.length === 0) {
    return getCategoryById(categoryId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(categoryId);

  const result = await runQuery<Category>(
    `UPDATE newsfeed_categories
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *`,
    values
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Soft delete category (set is_active = false) (Admin only)
 * @param categoryId The category ID
 * @returns true if deleted, false if not found
 */
export async function deleteCategory(categoryId: number): Promise<boolean> {
  const result = await runQuery(
    'UPDATE newsfeed_categories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [categoryId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Hard delete category (permanently remove) (Admin only)
 * WARNING: This will set category_id to NULL for all posts
 * @param categoryId The category ID
 * @returns true if deleted, false if not found
 */
export async function hardDeleteCategory(categoryId: number): Promise<boolean> {
  const result = await runQuery(
    'DELETE FROM newsfeed_categories WHERE id = $1',
    [categoryId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Reorder categories (Admin only)
 * @param orders Array of { id, display_order }
 */
export async function reorderCategories(
  orders: { id: number; display_order: number }[]
): Promise<void> {
  for (const order of orders) {
    await runQuery(
      'UPDATE newsfeed_categories SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [order.display_order, order.id]
    );
  }
}

/**
 * Toggle category active status (Admin only)
 * @param categoryId The category ID
 * @returns Updated category or null if not found
 */
export async function toggleCategoryActive(
  categoryId: number
): Promise<Category | null> {
  const result = await runQuery<Category>(
    `UPDATE newsfeed_categories
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *`,
    [categoryId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get posts count by category
 * @param categoryId The category ID
 * @returns Number of posts in the category
 */
export async function getPostsCountByCategory(
  categoryId: number
): Promise<number> {
  const result = await runQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM newsfeed_posts WHERE category_id = $1',
    [categoryId]
  );

  return result.rows[0]?.count || 0;
}

/**
 * Check if category name already exists
 * @param name Category name
 * @param excludeId Optional category ID to exclude (for updates)
 * @returns true if name exists, false otherwise
 */
export async function categoryNameExists(
  name: string,
  excludeId?: number
): Promise<boolean> {
  const query = excludeId
    ? 'SELECT id FROM newsfeed_categories WHERE name = $1 AND id != $2'
    : 'SELECT id FROM newsfeed_categories WHERE name = $1';

  const params = excludeId ? [name, excludeId] : [name];
  const result = await runQuery(query, params);

  return result.rows.length > 0;
}
