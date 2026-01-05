# Quick Start Guide - Dual Branch Setup

## 📋 Tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                    STABLE BRANCH (main)                      │
│  Backend: :3001  │  Frontend: :3000  │  Ngrok: Public URL   │
│  ✅ Luôn chạy    │  ✅ Cho users     │  🌍 Internet access │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                DEV BRANCH (feature/bugfix)                   │
│  Backend: :3003  │  Frontend: :3002  │  No ngrok            │
│  🛠️ Development  │  🧪 Local test    │  💻 Local only      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Bắt đầu nhanh

### ✅ Lần đầu tiên

**1. Start Stable Branch (cho production)**

```bash
# Terminal 1: Stable servers
git checkout main
start-stable-branch.bat

# Terminal 2: Ngrok tunnel
ngrok http 3000
```

**✅ XONG! Share ngrok URL với users**

---

### 🛠️ Khi code feature mới

**2. Start Dev Branch (cho development)**

```bash
# Terminal 3: Dev servers (KHÔNG đóng Terminal 1 & 2)
git checkout -b feature/my-feature
start-dev-branch.bat

# Test tại: http://localhost:3002
```

**✅ Code xong → Test → Merge → Restart stable servers**

---

## 📁 File Templates

| File | Mục đích |
|------|----------|
| `backend/.env` | Config hiện tại (stable hoặc dev) |
| `backend/.env.stable` | Template cho stable branch |
| `backend/.env.dev` | Template cho dev branch |

### Khi switch branch:

```bash
# Chuyển sang stable branch
git checkout main
copy backend\.env.stable backend\.env

# Chuyển sang dev branch
git checkout develop
copy backend\.env.dev backend\.env
```

---

## 🎯 Use Cases

### Scenario 1: Fix urgent bug

```bash
1. Stable vẫn chạy (users không bị ảnh hưởng)
2. git checkout -b hotfix/urgent-bug
3. start-dev-branch.bat
4. Fix bug, test tại :3002
5. git checkout main && git merge hotfix/urgent-bug
6. Restart stable servers
7. Ngrok tự động serve code mới
```

### Scenario 2: Develop new feature

```bash
1. Stable vẫn chạy (ngrok vẫn public)
2. git checkout -b feature/export-csv
3. start-dev-branch.bat
4. Code từ từ, test local :3002
5. Khi xong → merge → restart stable
```

---

## ⚡ Commands Cheat Sheet

| Task | Command |
|------|---------|
| 📍 Check branch | `git branch --show-current` |
| 🟢 Start stable | `start-stable-branch.bat` |
| 🔧 Start dev | `start-dev-branch.bat` |
| 🌐 Public access | `ngrok http 3000` (chỉ cho stable) |
| 🔍 Check ports | `netstat -ano \| findstr ":300"` |
| ❌ Kill port | `taskkill /PID <pid> /F` |
| 📝 Switch .env | `copy backend\.env.dev backend\.env` |

---

## 💡 Pro Tips

✅ **DO:**
- Giữ stable servers chạy 24/7
- Giữ ngrok tunnel chạy 24/7
- Code mọi thứ trên dev branch
- Test kỹ trên :3002 trước khi merge

❌ **DON'T:**
- Đừng code trực tiếp trên stable branch
- Đừng restart stable servers khi đang có users
- Đừng dùng cùng port cho cả 2 branches
- Đừng commit file `.env` (đã có trong .gitignore)

---

## 🎓 Workflow Example

```
08:00 - Start stable servers + ngrok
      → Share URL: https://xxxx.ngrok-free.app

09:00 - Bắt đầu code feature mới
      → git checkout -b feature/bulk-delete
      → start-dev-branch.bat
      → Code tại :3002

12:00 - Lunch (stable vẫn chạy, dev có thể tắt)

14:00 - Continue dev
      → start-dev-branch.bat (nếu đã tắt)

16:00 - Feature done, test OK
      → git checkout main
      → git merge feature/bulk-delete
      → Kill stable servers (Ctrl+C)
      → start-stable-branch.bat
      → Ngrok tự động serve code mới

17:00 - Bắt đầu feature khác...
```

---

## 🆘 Troubleshooting

### Port bị chiếm
```bash
netstat -ano | findstr :3000
taskkill /PID 12345 /F
```

### Ngrok không update code mới
```
→ Ngrok chỉ tunnel, không cache
→ Restart stable servers là đủ
→ KHÔNG cần restart ngrok
```

### Backend CORS error
```
→ Kiểm tra FRONTEND_URL trong .env
→ Stable: http://localhost:3000
→ Dev: http://localhost:3002
```

### Database conflict
```
→ Cả 2 branches dùng chung DB (an toàn)
→ Nếu cần riêng: tạo database mới cho dev
→ Dev DB: shinsei_shonin_dev
```
