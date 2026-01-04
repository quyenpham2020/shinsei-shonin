# PostgreSQL Conversion Status

## Conversion Requirements
1. Replace `?` placeholders with `$1`, `$2`, `$3` etc. (PostgreSQL positional parameters)
2. DO NOT replace `?` in ternary operators (condition ? true : false)
3. Change `= 1` and `= 0` for booleans to `= true` and `= false`
4. Add `await` before all `getOne()`, `getAll()`, and `runQuery()` calls
5. Make functions `async` if they use `await`
6. Change return type from `void` to `Promise<void>` for async functions
7. Replace `datetime('now')` with `CURRENT_TIMESTAMP`
8. Replace `1` and `0` for boolean inserts with `true` and `false`

## Files Completed ✅

### Controllers
1. **userController.ts** - COMPLETE
   - All SQL queries converted to PostgreSQL syntax
   - All database calls now use await
   - All functions are async with Promise<void> return types
   - Boolean values properly converted (true/false instead of 1/0)

2. **departmentController.ts** - COMPLETE
   - All SQL queries converted
   - Boolean comparisons updated (= true instead of = 1)
   - All functions properly async/await

3. **applicationController.ts** - COMPLETE
   - Complex dynamic query building with proper parameter indexing
   - All datetime('now') replaced with CURRENT_TIMESTAMP
   - generateApplicationNumber() made async
   - All functions updated to async/await

4. **approverController.ts** - PARTIAL (in progress)
   - getApprovers() - COMPLETE
   - getApprover() - COMPLETE
   - Remaining functions need conversion

### Services
1. **permissionService.ts** - COMPLETE
   - getUsersUnderAuthority() - fully converted
   - getManageableTeams() - fully converted and made async
   - canAssignOnsiteLeader() - fully converted and made async

## Files NOT Modified (Already Fixed)
- **authController.ts** - Already fixed according to user requirements
- **applicationTypeController.ts** - Already fixed according to user requirements

## Files Requiring Conversion 🔄

### High Priority Controllers (from user's list)
- [ ] approverController.ts - 50% complete, needs remaining functions
- [ ] attachmentController.ts
- [ ] customerController.ts
- [ ] favoriteController.ts
- [ ] feedbackController.ts
- [ ] pageFavoriteController.ts
- [ ] passwordController.ts
- [ ] revenueController.ts
- [ ] settingsController.ts
- [ ] systemAccessController.ts
- [ ] teamController.ts
- [ ] weeklyReportController.ts

### Services Requiring Conversion
- [ ] scheduler.ts
- [ ] gemini-client.ts
- [ ] emailService.ts

## Conversion Pattern Examples

### Pattern 1: Simple Single Parameter Query
```typescript
// BEFORE (SQLite)
const user = getOne(`SELECT * FROM users WHERE id = ?`, [userId]);

// AFTER (PostgreSQL)
const user = await getOne(`SELECT * FROM users WHERE id = $1`, [userId]);
```

### Pattern 2: Multiple Parameters
```typescript
// BEFORE
const result = runQuery(`
  INSERT INTO users (name, email, password)
  VALUES (?, ?, ?)
`, [name, email, password]);

// AFTER
const result = await runQuery(`
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
`, [name, email, password]);
```

### Pattern 3: Dynamic Query Building
```typescript
// BEFORE
let query = "SELECT * FROM users WHERE 1=1";
const params = [];
if (name) {
  query += " AND name = ?";
  params.push(name);
}
if (email) {
  query += " AND email = ?";
  params.push(email);
}

// AFTER
let query = "SELECT * FROM users WHERE 1=1";
const params: (string | number)[] = [];
if (name) {
  query += ` AND name = $${params.length + 1}`;
  params.push(name);
}
if (email) {
  query += ` AND email = $${params.length + 1}`;
  params.push(email);
}
```

### Pattern 4: Boolean Values
```typescript
// BEFORE
runQuery(`UPDATE users SET is_active = ? WHERE id = ?`, [1, userId]);
runQuery(`INSERT INTO settings (enabled) VALUES (?)`, [0]);
const active = getOne(`SELECT * FROM users WHERE is_active = 1`);

// AFTER
await runQuery(`UPDATE users SET is_active = $1 WHERE id = $2`, [true, userId]);
await runQuery(`INSERT INTO settings (enabled) VALUES ($1)`, [false]);
const active = await getOne(`SELECT * FROM users WHERE is_active = true`);
```

### Pattern 5: DateTime Functions
```typescript
// BEFORE
runQuery(`UPDATE applications SET updated_at = datetime('now') WHERE id = ?`, [id]);

// AFTER
await runQuery(`UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
```

### Pattern 6: Function Signature Changes
```typescript
// BEFORE
export const getUser = (req: AuthRequest, res: Response): void => {
  try {
    const user = getOne(`SELECT * FROM users WHERE id = ?`, [id]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

// AFTER
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await getOne(`SELECT * FROM users WHERE id = $1`, [id]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};
```

### Pattern 7: Ternary Operators (DO NOT CHANGE)
```typescript
// KEEP AS-IS - these are JavaScript ternary operators, not SQL
const value = condition ? true : false;
const status = isDraft ? 'draft' : 'pending';
weeklyReportExempt !== undefined ? weeklyReportExempt : null
```

## Testing Checklist
After conversion, verify:
- [ ] All database queries use PostgreSQL parameter syntax ($1, $2, etc.)
- [ ] All database calls have `await`
- [ ] All functions using await are `async`
- [ ] Boolean comparisons use `true`/`false` not `1`/`0`
- [ ] DateTime functions use `CURRENT_TIMESTAMP`
- [ ] No ternary operators (?) were mistakenly changed

## Notes
- When converting dynamic queries with variable parameters, use `$${params.length + 1}` pattern
- Watch for IN clauses with dynamic placeholders: `allowedUserIds.map((_, i) => $${params.length + i + 1}).join(',')`
- Functions that previously returned sync now return Promise<T>
- lastInsertRowid still works with PostgreSQL adapter
