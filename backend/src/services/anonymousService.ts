import { runQuery, getOne } from '../config/database';

/**
 * Anonymous Counting Service
 * Handles anonymous user indexing within posts
 */

export interface AnonymousMapping {
  id: number;
  post_id: number;
  user_id: number;
  anonymous_index: number;
  created_at: string;
}

export interface AnonymousMappingWithUser extends AnonymousMapping {
  user_name: string;
  user_email: string;
}

/**
 * Get or create anonymous index for a user in a post
 * Same user in same post = same index
 * @param postId The post ID
 * @param userId The user ID
 * @returns The anonymous index (1, 2, 3, ...)
 */
export async function getOrCreateAnonymousIndex(
  postId: number,
  userId: number
): Promise<number> {
  // Check if mapping already exists
  const existingResult = await runQuery<AnonymousMapping>(
    'SELECT anonymous_index FROM newsfeed_anonymous_mapping WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0].anonymous_index;
  }

  // Get max index for this post
  const maxIndexResult = await runQuery<{ max: number | null }>(
    'SELECT COALESCE(MAX(anonymous_index), 0) as max FROM newsfeed_anonymous_mapping WHERE post_id = $1',
    [postId]
  );

  const newIndex = (maxIndexResult.rows[0]?.max || 0) + 1;

  // Insert new mapping
  await runQuery(
    'INSERT INTO newsfeed_anonymous_mapping (post_id, user_id, anonymous_index) VALUES ($1, $2, $3)',
    [postId, userId, newIndex]
  );

  return newIndex;
}

/**
 * Get anonymous index for a user in a post (if exists)
 * @param postId The post ID
 * @param userId The user ID
 * @returns The anonymous index or null if not exists
 */
export async function getAnonymousIndex(
  postId: number,
  userId: number
): Promise<number | null> {
  const result = await runQuery<AnonymousMapping>(
    'SELECT anonymous_index FROM newsfeed_anonymous_mapping WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  return result.rows.length > 0 ? result.rows[0].anonymous_index : null;
}

/**
 * Get all anonymous mappings for a post (Admin only)
 * @param postId The post ID
 * @returns Array of mappings with user info
 */
export async function getAnonymousMappingsForPost(
  postId: number
): Promise<AnonymousMappingWithUser[]> {
  const result = await runQuery<AnonymousMappingWithUser>(
    `SELECT
      am.id,
      am.post_id,
      am.user_id,
      am.anonymous_index,
      am.created_at,
      u.name as user_name,
      u.email as user_email
    FROM newsfeed_anonymous_mapping am
    INNER JOIN users u ON am.user_id = u.id
    WHERE am.post_id = $1
    ORDER BY am.anonymous_index ASC`,
    [postId]
  );

  return result.rows;
}

/**
 * Get anonymous mappings for multiple posts (Admin only)
 * @param postIds Array of post IDs
 * @returns Map of post_id -> mappings
 */
export async function getAnonymousMappingsForPosts(
  postIds: number[]
): Promise<Map<number, AnonymousMappingWithUser[]>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const result = await runQuery<AnonymousMappingWithUser>(
    `SELECT
      am.id,
      am.post_id,
      am.user_id,
      am.anonymous_index,
      am.created_at,
      u.name as user_name,
      u.email as user_email
    FROM newsfeed_anonymous_mapping am
    INNER JOIN users u ON am.user_id = u.id
    WHERE am.post_id = ANY($1::int[])
    ORDER BY am.post_id, am.anonymous_index ASC`,
    [postIds]
  );

  const mappingsMap = new Map<number, AnonymousMappingWithUser[]>();

  for (const row of result.rows) {
    if (!mappingsMap.has(row.post_id)) {
      mappingsMap.set(row.post_id, []);
    }
    mappingsMap.get(row.post_id)!.push(row);
  }

  return mappingsMap;
}

/**
 * Get user info from anonymous index (Admin only)
 * @param postId The post ID
 * @param anonymousIndex The anonymous index
 * @returns User info or null
 */
export async function getUserFromAnonymousIndex(
  postId: number,
  anonymousIndex: number
): Promise<{ user_id: number; user_name: string; user_email: string } | null> {
  const result = await runQuery<{
    user_id: number;
    user_name: string;
    user_email: string;
  }>(
    `SELECT
      am.user_id,
      u.name as user_name,
      u.email as user_email
    FROM newsfeed_anonymous_mapping am
    INNER JOIN users u ON am.user_id = u.id
    WHERE am.post_id = $1 AND am.anonymous_index = $2`,
    [postId, anonymousIndex]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete all anonymous mappings for a post
 * Called when post is deleted (should be handled by CASCADE)
 * @param postId The post ID
 */
export async function deleteAnonymousMappingsForPost(
  postId: number
): Promise<void> {
  await runQuery(
    'DELETE FROM newsfeed_anonymous_mapping WHERE post_id = $1',
    [postId]
  );
}
