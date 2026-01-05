# Branch Workflow - Stable & Development

## Mục đích
Chạy đồng thời stable branch và dev branch để:
- Ngrok tunnel đến stable branch → không bị gián đoạn
- Dev branch để code features mới hoặc fix bugs
- Nếu dev branch có lỗi → không ảnh hưởng đến stable branch

---

## Cấu hình Ports

| Branch | Backend Port | Frontend Port | Ngrok |
|--------|-------------|---------------|-------|
| **Stable** (main) | 3001 | 3000 | ✅ `ngrok http 3000` |
| **Dev** (feature/bugfix) | 3003 | 3002 | ❌ (test local only) |

---

## Workflow

### 1️⃣ Setup Stable Branch (Lần đầu)

```bash
# Đảm bảo bạn đang ở stable branch
git checkout main  # hoặc master, hoặc production

# Chạy stable servers
start-stable-branch.bat

# Tạo ngrok tunnel (để public access)
ngrok http 3000
```

**Kết quả:**
- Backend chạy trên `http://localhost:3001`
- Frontend chạy trên `http://localhost:3000`
- Ngrok tạo public URL: `https://xxxx.ngrok-free.app`

**✅ Giữ nguyên các terminals này chạy!**

---

### 2️⃣ Làm việc với Dev Branch

```bash
# Tạo branch mới cho feature/bugfix
git checkout -b feature/new-feature

# hoặc switch sang branch dev có sẵn
git checkout develop

# Chạy dev servers (ports khác)
start-dev-branch.bat
```

**Kết quả:**
- Backend chạy trên `http://localhost:3003`
- Frontend chạy trên `http://localhost:3002`
- Test local tại: `http://localhost:3002`

---

### 3️⃣ Testing và Development

**Dev branch:**
- Code changes trên dev branch
- Test tại `http://localhost:3002`
- Nếu có lỗi → chỉ ảnh hưởng port 3002/3003

**Stable branch:**
- Vẫn chạy trên port 3000/3001
- Ngrok tunnel vẫn hoạt động bình thường
- Users không bị ảnh hưởng

---

### 4️⃣ Khi Dev Branch ổn định

```bash
# Test kỹ trên dev branch (port 3002)
# Nếu OK, merge vào stable branch

git checkout main
git merge feature/new-feature

# Dừng stable servers (Ctrl+C trong terminals)
# Restart stable servers để apply changes mới
start-stable-branch.bat

# Ngrok tunnel tự động dùng code mới
# (không cần restart ngrok)
```

---

## Lưu ý quan trọng

### ✅ Ưu điểm
1. **Không gián đoạn**: Stable branch luôn chạy, ngrok luôn accessible
2. **An toàn**: Lỗi ở dev branch không crash production
3. **Linh hoạt**: Test nhiều features khác nhau trên các branches

### ⚠️ Giới hạn
1. **Ngrok Free Plan**: Chỉ 1 tunnel → chỉ expose stable branch
2. **Resources**: Chạy 2 instances tốn RAM hơn
3. **Ports**: Phải nhớ dev branch dùng ports khác (3002/3003)

### 💡 Tips
- **Kiểm tra branch hiện tại**: `git branch --show-current`
- **Kill process trên port**:
  ```bash
  # Nếu port bị chiếm
  netstat -ano | findstr :3000
  taskkill /PID <process_id> /F
  ```
- **Dev branch cần backend URL khác**:
  - Frontend dev branch tự động dùng port 3002
  - Backend dev branch tự động dùng port 3003
  - Proxy vẫn hoạt động bình thường

---

## Quick Commands

| Task | Command |
|------|---------|
| Start stable | `start-stable-branch.bat` |
| Start dev | `start-dev-branch.bat` |
| Expose stable | `ngrok http 3000` |
| Check ports | `netstat -ano \| findstr ":300"` |
| Check branch | `git branch --show-current` |

---

## Example Workflow

```bash
# Morning: Start stable branch for production
start-stable-branch.bat
ngrok http 3000
# Share ngrok URL với users

# Làm việc: Code feature mới
git checkout -b feature/bulk-export
start-dev-branch.bat
# Code và test tại http://localhost:3002

# Afternoon: Feature done, merge
git checkout main
git merge feature/bulk-export
# Restart stable servers
# Ngrok tự động serve code mới

# Continue: Code another feature
git checkout -b fix/login-bug
# Dev servers vẫn chạy port 3002/3003
# Stable servers vẫn chạy port 3000/3001
```

---

## Troubleshooting

### Port đã được sử dụng
```bash
# Tìm process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <number> /F
```

### Backend không connect được
- Kiểm tra `FRONTEND_URL` trong backend `.env`
- Dev branch: `FRONTEND_URL=http://localhost:3002`
- Stable branch: `FRONTEND_URL=http://localhost:3000`

### Ngrok không cập nhật code mới
- Ngrok chỉ tunnel, không cache code
- Nếu stable servers restart → code mới tự động apply
- Không cần restart ngrok tunnel
