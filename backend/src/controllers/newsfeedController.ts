import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getAll, getOne, runQuery, query } from '../config/database';
import { getOrCreateAnonymousIndex, getAnonymousMappingsForPosts } from '../services/anonymousService';

/**
 * Get all posts for newsfeed
 */
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const isAdmin = user.role === 'admin';
    const { limit = 20, offset = 0, type, category, categoryId } = req.query;

    let sql = `
      SELECT
        p.*,
        CASE
          WHEN p.is_anonymous = true THEN '匿名'
          ELSE u.name
        END as author_name,
        u.department as author_department,
        u.name as real_user_name,
        am.anonymous_index
      FROM newsfeed_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN newsfeed_anonymous_mapping am ON p.id = am.post_id AND p.user_id = am.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      sql += ` AND p.post_type = $${paramIndex++}`;
      params.push(type);
    }

    if (category) {
      sql += ` AND p.category = $${paramIndex++}`;
      params.push(category);
    }

    if (categoryId) {
      sql += ` AND p.category_id = $${paramIndex++}`;
      params.push(categoryId);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const posts = await getAll(sql, params);

    // Process posts to add admin-only fields
    const processedPosts = posts.map((post: any) => {
      const result: any = {
        ...post,
        author_name: post.is_anonymous
          ? `匿名 #${post.anonymous_index || '?'}`
          : post.author_name,
      };

      // Admin can see real user name for anonymous posts
      if (isAdmin && post.is_anonymous) {
        result.real_user_name = post.real_user_name;
      } else {
        delete result.real_user_name;
      }

      return result;
    });

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM newsfeed_posts WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (type) {
      countSql += ` AND post_type = $${countParamIndex++}`;
      countParams.push(type);
    }

    if (category) {
      countSql += ` AND category = $${countParamIndex++}`;
      countParams.push(category);
    }

    if (categoryId) {
      countSql += ` AND category_id = $${countParamIndex++}`;
      countParams.push(categoryId);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      posts: processedPosts,
      pagination: {
        total,
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: parseInt(offset.toString()) + processedPosts.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: '投稿の取得に失敗しました' });
  }
};

/**
 * Get single post with comments
 */
export const getPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const post = await getOne(
      `SELECT
        p.*,
        CASE
          WHEN p.is_anonymous = true THEN '匿名'
          ELSE u.name
        END as author_name,
        u.department as author_department
      FROM newsfeed_posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1`,
      [id]
    );

    if (!post) {
      res.status(404).json({ message: '投稿が見つかりません' });
      return;
    }

    // Get comments
    const comments = await getAll(
      `SELECT
        c.*,
        CASE
          WHEN c.is_anonymous = true THEN '匿名'
          ELSE u.name
        END as author_name,
        u.department as author_department
      FROM newsfeed_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({ post, comments });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: '投稿の取得に失敗しました' });
  }
};

/**
 * Create new post
 */
export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { content, postType = 'general', category, categoryId, isAnonymous = false, imageUrl } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({ message: '内容を入力してください' });
      return;
    }

    // Check if anonymous posting is allowed
    const setting = await getOne(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['allow_anonymous_posts']
    );

    const allowAnonymous = setting?.setting_value === 'true';
    if (isAnonymous && !allowAnonymous) {
      res.status(403).json({ message: '匿名投稿は現在無効になっています' });
      return;
    }

    const result = await query(
      `INSERT INTO newsfeed_posts (
        user_id, content, post_type, category, category_id, is_anonymous, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user.id, content, postType, category, categoryId || null, isAnonymous, imageUrl]
    );

    const post = result.rows[0];

    // Create anonymous mapping if anonymous
    let anonymousIndex: number | undefined;
    if (isAnonymous) {
      anonymousIndex = await getOrCreateAnonymousIndex(post.id, user.id);
    }

    res.status(201).json({
      ...post,
      author_name: isAnonymous ? `匿名 #${anonymousIndex}` : user.name,
      author_department: isAnonymous ? undefined : user.department,
      anonymous_index: anonymousIndex,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: '投稿の作成に失敗しました' });
  }
};

/**
 * Update post
 */
export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { content, postType, category, imageUrl } = req.body;

    const post = await getOne('SELECT * FROM newsfeed_posts WHERE id = $1', [id]);

    if (!post) {
      res.status(404).json({ message: '投稿が見つかりません' });
      return;
    }

    if (post.user_id !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '編集権限がありません' });
      return;
    }

    await runQuery(
      `UPDATE newsfeed_posts SET
        content = COALESCE($1, content),
        post_type = COALESCE($2, post_type),
        category = COALESCE($3, category),
        image_url = COALESCE($4, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5`,
      [content, postType, category, imageUrl, id]
    );

    const updated = await getOne('SELECT * FROM newsfeed_posts WHERE id = $1', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: '投稿の更新に失敗しました' });
  }
};

/**
 * Delete post
 */
export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const post = await getOne('SELECT * FROM newsfeed_posts WHERE id = $1', [id]);

    if (!post) {
      res.status(404).json({ message: '投稿が見つかりません' });
      return;
    }

    if (post.user_id !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '削除権限がありません' });
      return;
    }

    await runQuery('DELETE FROM newsfeed_posts WHERE id = $1', [id]);
    res.json({ message: '投稿を削除しました' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: '投稿の削除に失敗しました' });
  }
};

/**
 * Add comment to post
 */
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { content, isAnonymous = false, parentCommentId } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({ message: 'コメントを入力してください' });
      return;
    }

    // Check if anonymous commenting is allowed
    const setting = await getOne(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['allow_anonymous_comments']
    );

    const allowAnonymous = setting?.setting_value === 'true';
    if (isAnonymous && !allowAnonymous) {
      res.status(403).json({ message: '匿名コメントは現在無効になっています' });
      return;
    }

    const result = await query(
      `INSERT INTO newsfeed_comments (
        post_id, user_id, content, is_anonymous, parent_comment_id
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, user.id, content, isAnonymous, parentCommentId]
    );

    // Update comments count
    await runQuery(
      'UPDATE newsfeed_posts SET comments_count = comments_count + 1 WHERE id = $1',
      [id]
    );

    const comment = result.rows[0];

    res.status(201).json({
      ...comment,
      author_name: isAnonymous ? '匿名' : user.name,
      author_department: isAnonymous ? undefined : user.department,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'コメントの追加に失敗しました' });
  }
};

/**
 * Delete comment
 */
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { commentId } = req.params;

    const comment = await getOne('SELECT * FROM newsfeed_comments WHERE id = $1', [commentId]);

    if (!comment) {
      res.status(404).json({ message: 'コメントが見つかりません' });
      return;
    }

    if (comment.user_id !== user.id && user.role !== 'admin') {
      res.status(403).json({ message: '削除権限がありません' });
      return;
    }

    await runQuery('DELETE FROM newsfeed_comments WHERE id = $1', [commentId]);

    // Update comments count
    await runQuery(
      'UPDATE newsfeed_posts SET comments_count = comments_count - 1 WHERE id = $1',
      [comment.post_id]
    );

    res.json({ message: 'コメントを削除しました' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'コメントの削除に失敗しました' });
  }
};

/**
 * Add or change reaction to a post
 */
export const toggleReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reactionType = 'like' } = req.body; // like, love, dislike, etc.

    // Validate reaction type
    const validTypes = ['like', 'love', 'dislike', 'haha', 'wow', 'sad', 'angry'];
    if (!validTypes.includes(reactionType)) {
      res.status(400).json({ message: '無効なリアクションタイプです' });
      return;
    }

    // Check if already reacted
    const existing = await getOne(
      'SELECT * FROM newsfeed_reactions WHERE post_id = $1 AND user_id = $2',
      [id, user.id]
    );

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Remove reaction if clicking same type
        await runQuery('DELETE FROM newsfeed_reactions WHERE post_id = $1 AND user_id = $2', [
          id,
          user.id,
        ]);
        await runQuery('UPDATE newsfeed_posts SET likes_count = likes_count - 1 WHERE id = $1', [id]);
        res.json({ reactionType: null });
      } else {
        // Change reaction type
        await runQuery(
          'UPDATE newsfeed_reactions SET reaction_type = $1 WHERE post_id = $2 AND user_id = $3',
          [reactionType, id, user.id]
        );
        res.json({ reactionType });
      }
    } else {
      // Add new reaction
      await runQuery(
        'INSERT INTO newsfeed_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)',
        [id, user.id, reactionType]
      );
      await runQuery('UPDATE newsfeed_posts SET likes_count = likes_count + 1 WHERE id = $1', [id]);
      res.json({ reactionType });
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ message: 'リアクションの処理に失敗しました' });
  }
};

/**
 * Get user's reaction to a post
 */
export const getUserReaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const reaction = await getOne(
      'SELECT reaction_type FROM newsfeed_reactions WHERE post_id = $1 AND user_id = $2',
      [id, user.id]
    );

    res.json({ reactionType: reaction?.reaction_type || null });
  } catch (error) {
    console.error('Error getting reaction:', error);
    res.status(500).json({ message: 'リアクションの取得に失敗しました' });
  }
};

/**
 * Get reaction counts for a post
 */
export const getReactionCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const counts = await getAll(
      `SELECT reaction_type, COUNT(*) as count
       FROM newsfeed_reactions
       WHERE post_id = $1
       GROUP BY reaction_type`,
      [id]
    );

    const result: { [key: string]: number } = {};
    counts.forEach((row: any) => {
      result[row.reaction_type] = parseInt(row.count);
    });

    res.json(result);
  } catch (error) {
    console.error('Error getting reaction counts:', error);
    res.status(500).json({ message: 'リアクション数の取得に失敗しました' });
  }
};

// Legacy support - keep old endpoints working
export const toggleLike = toggleReaction;
export const checkLike = getUserReaction;
