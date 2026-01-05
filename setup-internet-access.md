# Internet Access Setup với Ngrok

## Bước 1: Khởi động Ngrok Tunnels

Mở **2 terminal/PowerShell windows riêng biệt** và chạy:

### Terminal 1 - Backend Tunnel
```bash
ngrok http 3001
```

### Terminal 2 - Frontend Tunnel
```bash
ngrok http 3000
```

## Bước 2: Lấy Ngrok URLs

Sau khi chạy, mỗi terminal sẽ hiển thị thông tin như sau:

```
Session Status                online
Account                       hananguyen (Plan: Free)
Version                       3.x.x
Region                        Asia Pacific (ap)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-yyyy-zzzz.ngrok-free.app -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Chú ý dòng `Forwarding`:**
- Backend: `https://xxxx-yyyy-zzzz.ngrok-free.app` → port 3001
- Frontend: `https://aaaa-bbbb-cccc.ngrok-free.app` → port 3000

## Bước 3: Cập nhật Frontend Config

### 3.1. Mở file `frontend/.env`

```bash
notepad frontend/.env
```

### 3.2. Sửa VITE_API_URL

```env
# Frontend Environment Variables

# API URL
# Dùng ngrok backend URL (thay xxxx-yyyy-zzzz bằng URL thực tế)
VITE_API_URL=https://xxxx-yyyy-zzzz.ngrok-free.app

# Backup: For local network access
# VITE_API_URL=http://192.168.3.5:3001
```

## Bước 4: Rebuild Frontend

```bash
cd frontend
npm run build
```

## Bước 5: Serve Frontend qua Ngrok

Bây giờ có **2 cách** để truy cập:

### Cách A: Truy cập trực tiếp qua Frontend Ngrok URL (Đơn giản nhất)

Mở browser và truy cập:
```
https://aaaa-bbbb-cccc.ngrok-free.app
```

Ngrok sẽ hiện cảnh báo → Click **"Visit Site"**

✅ Done! Bạn có thể chia sẻ URL này cho bất kỳ ai trên Internet!

### Cách B: Chạy Production Server và Ngrok (Tối ưu hơn)

```bash
# Terminal 3 - Serve built frontend
cd frontend
npx serve -s dist -p 3000

# Ngrok đã chạy ở Terminal 2 sẽ forward traffic
```

## Bước 6: Test từ máy khác

Từ **bất kỳ máy nào có Internet**, mở browser:

```
https://aaaa-bbbb-cccc.ngrok-free.app
```

Đăng nhập bằng:
- Username: quyet/van/tai
- Password: quyet/van/tai

## 📌 Lưu ý quan trọng

### 1. Ngrok URLs thay đổi mỗi lần restart
- Mỗi khi restart ngrok → URL mới
- Phải cập nhật lại `frontend/.env` và rebuild

### 2. Ngrok Free Plan giới hạn
- ✅ 1 ngrok process mỗi lúc (nhưng có thể chạy nhiều tunnels)
- ⚠️ URLs không cố định
- ⚠️ Session timeout sau vài giờ

### 3. Giải pháp cho URLs cố định

**Nâng cấp Ngrok (Paid)**:
```bash
# Với ngrok paid plan, có thể dùng custom domain
ngrok http 3001 --domain=your-app.ngrok.app
```

**Hoặc Deploy lên Cloud** (Miễn phí):
- Render.com
- Vercel (frontend)
- Railway.app
- Heroku

## Cách tốt hơn: Chạy 2 tunnels trong 1 ngrok process

### Tạo file `ngrok.yml`:

```yaml
version: "2"
authtoken: YOUR_NGROK_AUTH_TOKEN

tunnels:
  backend:
    proto: http
    addr: 3001
  frontend:
    proto: http
    addr: 3000
```

### Chạy:
```bash
ngrok start --all --config ngrok.yml
```

## Troubleshooting

### Lỗi: "ERR_NGROK_6024"
- Ngrok free chỉ cho 1 process
- Kill process cũ: `taskkill /F /IM ngrok.exe`
- Chạy lại

### Lỗi: "Failed to connect to ngrok API"
- Check internet connection
- Ngrok có thể bị firewall chặn
- Thử: `ngrok config check`

### Frontend không call được Backend
- Kiểm tra `VITE_API_URL` trong `.env` đúng chưa
- Phải rebuild sau khi sửa .env
- Check browser console xem URL nào đang được call

## Script tự động (Windows)

Tạo file `start-ngrok.bat`:

```batch
@echo off
echo Starting Backend Ngrok...
start "Ngrok Backend" ngrok http 3001

echo Starting Frontend Ngrok...
start "Ngrok Frontend" ngrok http 3000

echo.
echo Ngrok tunnels started!
echo.
echo Backend: Check http://localhost:4040 for backend URL
echo Frontend: Check http://localhost:4041 for frontend URL
echo.
echo Press any key to stop all ngrok tunnels...
pause

taskkill /F /IM ngrok.exe
```

---

**Cập nhật:** 2026-01-05
