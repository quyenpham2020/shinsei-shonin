# Bug Fixes Log & Prompts for Future Reference

## 📋 Common UI/UX Issues & Fix Templates

### 1. ❌ Bug: Dialog mất data cũ / Hiển thị stale data

**Triệu chứng:**
- Dialog hiển thị data từ lần mở trước
- Thông tin không update khi mở lại dialog
- Data bị trùng lặp hoặc không chính xác

**Nguyên nhân:**
- State không được clear khi close dialog
- Dialog mở trước khi fetch API xong
- Không clear state trước khi fetch data mới

**Fix Template:**
```typescript
// ❌ BAD - Không clear state
const handleOpenDialog = async () => {
  setOpenDialog(true);  // Mở trước
  const data = await fetchData();  // Fetch sau → Hiển thị data cũ trong lúc fetch
  setData(data);
};

// ✅ GOOD - Clear state trước khi mở
const handleOpenDialog = async () => {
  // Clear state trước
  setData([]);
  setLoading(true);
  setOpenDialog(true);

  // Fetch data
  const newData = await fetchData();
  setData(newData);
  setLoading(false);
};

// ✅ GOOD - Clear khi close
const handleCloseDialog = () => {
  setOpenDialog(false);
  // Clear tất cả state liên quan
  setData([]);
  setSelectedItem(null);
};
```

**Prompt để fix:**
```
📍 Task: Fix dialog hiển thị stale data
📂 Files: [Component]Page.tsx
🎯 Scope:
  - Thêm clear state trước khi mở dialog
  - Thêm cleanup function khi close dialog
  - Đảm bảo data luôn fresh
⛔ No touch: Backend, API calls, Services
✅ Expected: Dialog luôn hiển thị data mới
```

**Applied to:**
- ✅ TeamManagementPage.tsx (2026-01-08) - Members dialog

---

### 2. ❌ Bug: Table column quá rộng che mất action buttons

**Triệu chứng:**
- Phải scroll ngang mới thấy action buttons
- Column description/note chiếm quá nhiều space
- UX không tốt trên màn hình nhỏ

**Nguyên nhân:**
- Column width không được giới hạn
- maxWidth quá lớn hoặc không có
- noWrap nhưng không có maxWidth

**Fix Template:**
```typescript
// ❌ BAD - Column quá rộng
<TableCell>
  <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
    {description}
  </Typography>
</TableCell>

// ✅ GOOD - Giới hạn width hợp lý
<TableCell sx={{ maxWidth: 100 }}>
  <Typography variant="body2" noWrap>
    {description}
  </Typography>
</TableCell>

// ✅ GOOD - Width phụ thuộc vào nội dung
// Description: ~100px (4-5 chữ)
// Name: ~150px (6-8 chữ)
// Email: ~200px
// Date: ~120px
```

**Prompt để fix:**
```
📍 Task: Fix table column width để nhìn thấy action buttons
📂 Files: [Component]Page.tsx
🎯 Scope:
  - Giảm maxWidth của column description/note xuống ~100px
  - Giữ noWrap để text không wrap
  - Đảm bảo action buttons luôn visible
⛔ No touch: Data, Backend, Other columns
✅ Expected: Thấy action buttons không cần scroll ngang
```

**Applied to:**
- ✅ TeamManagementPage.tsx (2026-01-08) - Description column: maxWidth 100px

---

### 3. ✅ Feature: Full Screen Mode cho Table

**Use case:**
- Table có nhiều data cần xem toàn bộ
- Cần thao tác với nhiều rows cùng lúc
- Description cần xem đầy đủ trong full screen

**Implementation:**
```typescript
// 1. Add state
const [fullScreen, setFullScreen] = useState(false);

// 2. Add button
<IconButton onClick={() => setFullScreen(!fullScreen)}>
  {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
</IconButton>

// 3. Conditional render
{fullScreen ? (
  <Dialog open={fullScreen} onClose={() => setFullScreen(false)} fullScreen>
    {/* Full screen table với description không truncate */}
  </Dialog>
) : (
  <TableContainer>
    {/* Normal table với description truncate */}
  </TableContainer>
)}
```

**Applied to:**
- ✅ TeamManagementPage.tsx (2026-01-08)

---

### 4. ❌ Bug: Translation không update

**Triệu chứng:**
- Text hiển thị sai
- Title/Label cũ chưa đổi
- i18n key không match

**Nguyên nhân:**
- Translation file chưa update
- Key sai trong component
- Cache browser chưa clear

**Fix Template:**
```json
// ❌ BAD - Trong ja/auth.json
"title": "申請・承認管理"

// ✅ GOOD - Update title
"title": "社内ポータル"
```

**Prompt để fix:**
```
📍 Task: Update translation text
📂 Files:
  - frontend/src/i18n/locales/ja/[file].json
  - (Nếu có) Component sử dụng translation
🎯 Scope:
  - Sửa translation key/value
  - Verify trong component
⛔ No touch: Backend, Other translations
✅ Expected: Text hiển thị đúng theo yêu cầu
```

**Applied to:**
- ✅ auth.json, common.json (2026-01-08) - "申請・承認管理" → "社内ポータル"

---

## 📝 Quick Fix Checklist

Khi gặp UI bug, check theo thứ tự:

### Dialog Issues:
- [ ] State có được clear trước khi open?
- [ ] State có được clear khi close?
- [ ] Dialog mở sau khi fetch xong?
- [ ] Loading state có được set đúng?

### Table Issues:
- [ ] Column width có hợp lý (~100-200px)?
- [ ] Action buttons có bị che không?
- [ ] Có cần full screen mode?
- [ ] Responsive trên mobile OK?

### Translation Issues:
- [ ] Key đúng trong component?
- [ ] Value đúng trong translation file?
- [ ] Browser cache đã clear?

### Performance Issues:
- [ ] Có re-render không cần thiết?
- [ ] API call có bị duplicate?
- [ ] Có memory leak từ state?

---

## 🎯 Prompt Template Tổng Quát

```
📍 Task: [Mô tả ngắn gọn bug/feature]
📂 Files:
  - [Component chính].tsx
  - [Service nếu cần]
  - [Translation nếu cần]
🎯 Scope:
  - [Chính xác điều cần fix]
  - [Đảm bảo không ảnh hưởng gì]
⛔ No touch:
  - Backend code
  - Database
  - Other components không liên quan
  - [Liệt kê cụ thể]
✅ Expected:
  - [Kết quả mong đợi]
  - [Cách test]
```

---

## 📊 Pages cần apply fixes tương tự

### High Priority (Likely có issues tương tự):
- [ ] UserListPage.tsx - Dialog mất data, column width
- [ ] DepartmentManagementPage.tsx - Dialog mất data, column width
- [ ] WeeklyReportPage.tsx - Table column width
- [ ] ApplicationListPage.tsx - Table column width, full screen mode
- [ ] CustomerManagementPage.tsx - Dialog mất data, column width
- [ ] RevenueManagementPage.tsx - Table column width
- [ ] FeedbackManagementPage.tsx - Dialog mất data

### Medium Priority:
- [ ] NewApplicationPage.tsx - Dialog issues
- [ ] SystemAccessPage.tsx - Table width
- [ ] NewsfeedPage.tsx - Dialog issues

### Low Priority (Simple pages):
- [ ] DashboardPage.tsx
- [ ] ChangePasswordPage.tsx

---

## 📈 Metrics

**Bugs Fixed:** 3
**Pages Updated:** 1 (TeamManagementPage)
**Date:** 2026-01-08

---

## 💡 Best Practices Moving Forward

1. **Always clear dialog state**
   - Clear before open
   - Clear on close
   - Clear on unmount

2. **Limit column widths**
   - Description: ~100px
   - Name: ~150px
   - Email: ~200px
   - Always keep action buttons visible

3. **Add full screen for complex tables**
   - Tables with 5+ columns
   - Tables with long descriptions
   - Tables with many rows

4. **Test dialog behavior**
   - Open → Close → Open again
   - Switch between different items
   - Fast clicking

5. **Mobile first**
   - Design for 375px width
   - Action buttons always accessible
   - Important info visible without scroll
