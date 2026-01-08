# NewsFeed - Anonymous Counting & Categories Design

**Ngày tạo:** 2026-01-08
**Version:** 1.0

---

## 📋 Overview

### Feature 1: Anonymous User Counting & Admin View
- Đánh số thứ tự cho users nặc danh (Nặc danh #1, #2, #3...)
- Admin có thể xem được user thật đằng sau anonymous posts/comments
- Users thường chỉ thấy "Nặc danh #X"

### Feature 2: Admin-Configurable Categories
- Admin có thể tạo/sửa/xóa categories cho posts
- Categories hiển thị ở left sidebar menu để filter
- Ví dụ: Know-how, Event Photos, Vote, Food & Fun Tips, etc.

---

## 🗄️ Database Schema Design

### 1. Anonymous Mapping Table

```sql
CREATE TABLE newsfeed_anonymous_mapping (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  anonymous_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (post_id) REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(post_id, user_id),
  UNIQUE(post_id, anonymous_index)
);

CREATE INDEX idx_anonymous_mapping_post ON newsfeed_anonymous_mapping(post_id);
CREATE INDEX idx_anonymous_mapping_user ON newsfeed_anonymous_mapping(user_id);
```

**Logic:**
- Mỗi post có mapping riêng của anonymous users
- Cùng 1 user trong cùng 1 post = cùng 1 index
- User A là "Nặc danh #1" trong post X, có thể là "#2" trong post Y
- Index được assign theo thứ tự post/comment (1, 2, 3...)

**Workflow:**
```
User posts/comments anonymously
  ↓
Check if user already has index in this post
  ↓ NO
Assign new index = MAX(anonymous_index) + 1
  ↓
Store mapping in table
  ↓
Return anonymous_index to frontend
```

---

### 2. Categories Table

```sql
CREATE TABLE newsfeed_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(20),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_active ON newsfeed_categories(is_active, display_order);
```

**Default Categories:**
```sql
INSERT INTO newsfeed_categories (name, name_en, icon, color, display_order) VALUES
('一般', 'General', 'article', '#757575', 1),
('ノウハウ', 'Know-how', 'lightbulb', '#ff9800', 2),
('イベント写真', 'Event Photos', 'photo_camera', '#2196f3', 3),
('投票', 'Vote', 'poll', '#9c27b0', 4),
('グルメ・遊び', 'Food & Fun', 'restaurant', '#f44336', 5),
('お知らせ', 'Announcement', 'campaign', '#4caf50', 6);
```

---

### 3. Modify newsfeed_posts Table

```sql
-- Add category_id column
ALTER TABLE newsfeed_posts
ADD COLUMN category_id INTEGER,
ADD FOREIGN KEY (category_id) REFERENCES newsfeed_categories(id) ON DELETE SET NULL;

-- Keep post_type for backward compatibility
-- Will migrate post_type to category_id gradually
```

**Migration Strategy:**
1. Create categories table with defaults
2. Add category_id column to newsfeed_posts
3. Map existing post_type values to category_id:
   - 'general' → General category
   - 'announcement' → Announcement category
   - 'knowhow' → Know-how category
4. Keep post_type column for now (can remove later)

---

## 🔌 API Design

### Anonymous Counting APIs

#### GET /api/newsfeed/posts/:postId/anonymous-map
**Purpose:** Get anonymous mapping for a post (Admin only)

**Response:**
```json
{
  "mappings": [
    {
      "anonymous_index": 1,
      "user_id": 123,
      "user_name": "田中太郎",
      "created_at": "2026-01-08T10:00:00Z"
    },
    {
      "anonymous_index": 2,
      "user_id": 456,
      "user_name": "山田花子",
      "created_at": "2026-01-08T10:05:00Z"
    }
  ]
}
```

#### Internal Function: `getOrCreateAnonymousIndex(postId, userId)`
**Purpose:** Get existing or create new anonymous index for a user in a post

**Logic:**
```typescript
async function getOrCreateAnonymousIndex(postId: number, userId: number): Promise<number> {
  // Check if mapping exists
  const existing = await db.query(
    'SELECT anonymous_index FROM newsfeed_anonymous_mapping WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].anonymous_index;
  }

  // Get max index for this post
  const maxIndex = await db.query(
    'SELECT COALESCE(MAX(anonymous_index), 0) as max FROM newsfeed_anonymous_mapping WHERE post_id = $1',
    [postId]
  );

  const newIndex = maxIndex.rows[0].max + 1;

  // Insert new mapping
  await db.query(
    'INSERT INTO newsfeed_anonymous_mapping (post_id, user_id, anonymous_index) VALUES ($1, $2, $3)',
    [postId, userId, newIndex]
  );

  return newIndex;
}
```

---

### Category Management APIs

#### GET /api/newsfeed/categories
**Purpose:** Get all active categories (Public)

**Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "一般",
      "name_en": "General",
      "icon": "article",
      "color": "#757575",
      "post_count": 45
    },
    {
      "id": 2,
      "name": "ノウハウ",
      "name_en": "Know-how",
      "icon": "lightbulb",
      "color": "#ff9800",
      "post_count": 12
    }
  ]
}
```

#### GET /api/admin/newsfeed/categories
**Purpose:** Get all categories including inactive (Admin only)

#### POST /api/admin/newsfeed/categories
**Purpose:** Create new category (Admin only)

**Request:**
```json
{
  "name": "新カテゴリー",
  "name_en": "New Category",
  "icon": "category",
  "color": "#00bcd4",
  "display_order": 7
}
```

#### PUT /api/admin/newsfeed/categories/:id
**Purpose:** Update category (Admin only)

#### DELETE /api/admin/newsfeed/categories/:id
**Purpose:** Soft delete category (set is_active = false) (Admin only)

#### PUT /api/admin/newsfeed/categories/reorder
**Purpose:** Reorder categories (Admin only)

**Request:**
```json
{
  "orders": [
    { "id": 1, "display_order": 1 },
    { "id": 2, "display_order": 2 }
  ]
}
```

---

## 🎨 Frontend Design

### Anonymous Display

#### Regular Users
```tsx
// Post/Comment by anonymous user
<Box display="flex" alignItems="center">
  <Avatar sx={{ bgcolor: '#9e9e9e' }}>
    <PersonIcon />
  </Avatar>
  <Typography variant="subtitle1">
    Nặc danh #{anonymousIndex}
  </Typography>
</Box>
```

#### Admin View
```tsx
// Admin sees both anonymous index AND real user
<Box display="flex" alignItems="center">
  <Tooltip title={`Real user: ${realUserName}`}>
    <Avatar sx={{ bgcolor: '#9e9e9e' }}>
      <PersonIcon />
    </Avatar>
  </Tooltip>
  <Typography variant="subtitle1">
    Nặc danh #{anonymousIndex}
    <Chip
      label={realUserName}
      size="small"
      color="warning"
      sx={{ ml: 1 }}
    />
  </Typography>
</Box>
```

---

### Category Sidebar Menu

```tsx
<Drawer variant="permanent">
  <List>
    <ListItemButton selected={selectedCategory === null}>
      <ListItemIcon><AllIcon /></ListItemIcon>
      <ListItemText primary="すべて" />
      <Chip label={totalPosts} size="small" />
    </ListItemButton>

    {categories.map(category => (
      <ListItemButton
        key={category.id}
        selected={selectedCategory === category.id}
        onClick={() => handleCategoryChange(category.id)}
      >
        <ListItemIcon sx={{ color: category.color }}>
          <Icon>{category.icon}</Icon>
        </ListItemIcon>
        <ListItemText primary={category.name} />
        <Chip label={category.post_count} size="small" />
      </ListItemButton>
    ))}
  </List>

  {isAdmin && (
    <Button onClick={openCategoryManagement}>
      カテゴリー管理
    </Button>
  )}
</Drawer>
```

---

### Category Management Dialog (Admin)

```tsx
<Dialog open={categoryDialogOpen} maxWidth="md" fullWidth>
  <DialogTitle>カテゴリー管理</DialogTitle>
  <DialogContent>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Order</TableCell>
          <TableCell>Icon</TableCell>
          <TableCell>Name</TableCell>
          <TableCell>Color</TableCell>
          <TableCell>Posts</TableCell>
          <TableCell>Active</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {categories.map((category, index) => (
          <TableRow key={category.id}>
            <TableCell>
              <IconButton onClick={() => moveUp(index)}>
                <ArrowUpIcon />
              </IconButton>
              <IconButton onClick={() => moveDown(index)}>
                <ArrowDownIcon />
              </IconButton>
            </TableCell>
            <TableCell>
              <Icon sx={{ color: category.color }}>
                {category.icon}
              </Icon>
            </TableCell>
            <TableCell>{category.name}</TableCell>
            <TableCell>
              <Box sx={{
                width: 24,
                height: 24,
                bgcolor: category.color,
                borderRadius: 1
              }} />
            </TableCell>
            <TableCell>{category.post_count}</TableCell>
            <TableCell>
              <Switch
                checked={category.is_active}
                onChange={() => toggleActive(category.id)}
              />
            </TableCell>
            <TableCell>
              <IconButton onClick={() => editCategory(category)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => deleteCategory(category.id)}>
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    <Button onClick={openAddCategoryDialog}>
      + 新しいカテゴリー
    </Button>
  </DialogContent>
</Dialog>
```

---

## 🔄 Data Flow

### Anonymous Post Creation Flow

```
User clicks "Post Anonymously"
  ↓
POST /api/newsfeed/posts { isAnonymous: true }
  ↓
Backend creates post
  ↓
getOrCreateAnonymousIndex(postId, userId)
  ↓
Return post with anonymous_index
  ↓
Frontend displays "Nặc danh #X"
```

### Category Filter Flow

```
User clicks category in sidebar
  ↓
GET /api/newsfeed/posts?category=2&limit=3&offset=0
  ↓
Backend filters by category_id
  ↓
Return filtered posts
  ↓
Frontend displays filtered posts
```

---

## 📊 Example Queries

### Get posts with anonymous info
```sql
SELECT
  p.*,
  CASE
    WHEN p.is_anonymous THEN am.anonymous_index
    ELSE NULL
  END as anonymous_index,
  CASE
    WHEN p.is_anonymous AND $userIsAdmin THEN u.name
    ELSE NULL
  END as real_user_name
FROM newsfeed_posts p
LEFT JOIN newsfeed_anonymous_mapping am
  ON p.id = am.post_id AND p.created_by = am.user_id
LEFT JOIN users u ON p.created_by = u.id
WHERE p.category_id = $categoryId
ORDER BY p.created_at DESC;
```

### Get categories with post counts
```sql
SELECT
  c.*,
  COUNT(p.id) as post_count
FROM newsfeed_categories c
LEFT JOIN newsfeed_posts p ON c.id = p.category_id
WHERE c.is_active = true
GROUP BY c.id
ORDER BY c.display_order;
```

---

## ✅ Implementation Checklist

### Backend
- [ ] Create migration for anonymous_mapping table
- [ ] Create migration for categories table
- [ ] Implement getOrCreateAnonymousIndex function
- [ ] Update createPost to handle anonymous index
- [ ] Update getPost/getPosts to include anonymous_index
- [ ] Create admin API to view anonymous mappings
- [ ] Create category CRUD APIs
- [ ] Update getPosts to filter by category
- [ ] Add permission checks for admin APIs

### Frontend
- [ ] Update post/comment display to show "Nặc danh #X"
- [ ] Add admin tooltip/chip for real user names
- [ ] Create left sidebar with category filter
- [ ] Update post creation dialog with category select
- [ ] Create admin category management dialog
- [ ] Add category icons/colors display
- [ ] Update filter logic to use category

### Testing
- [ ] Test anonymous index assignment
- [ ] Test same user gets same index in same post
- [ ] Test admin can see real users
- [ ] Test category filter
- [ ] Test category CRUD operations
- [ ] Test permission checks

---

**Last Updated:** 2026-01-08
**Status:** Design Phase Complete ✅
