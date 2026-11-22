# Tính Nhanh Luyện Não

Ứng dụng luyện tính nhẩm 1 chữ số và kiểm tra trí nhớ 20 từ. Chạy hoàn toàn offline, không thu thập dữ liệu; lịch sử lưu trong `localStorage` của trình duyệt.

- Giao diện chủ đề toán học, icon [Lucide](https://lucide.dev), hiệu ứng [GSAP](https://gsap.com), biểu đồ Chart.js (đều đặt sẵn trong `www/vendor/`).
- Mã nguồn web nằm trong `www/` (HTML, CSS, JS module, không cần build).

## Chạy thử

```bash
python3 -m http.server 8000 --directory www   # mở http://localhost:8000
python3 main_desktop.py                        # cửa sổ desktop (cần pywebview)
```

## Android (Capacitor)

```bash
npm install
npx cap sync
npx cap open android
```
