# Tính Nhanh Luyện Não

Ứng dụng luyện tính nhẩm và trí nhớ cho cả trẻ em lẫn người lớn. Chạy hoàn toàn offline, không thu thập dữ liệu; lịch sử lưu trong `localStorage` của trình duyệt.

Bản chạy trên web: https://s2soma.github.io/TrainBrain/

## Tính năng

- **Tính nhẩm** theo số câu (10 / 20 / 90), **Tốc độ** (đúng nhiều nhất trong 60 giây) và **Nhớ từ** (ghi nhớ 20 từ trong 2 phút).
- **Độ khó** Dễ / Vừa / Khó, **dạng bài** tìm kết quả (`3 + 5 = ?`) hoặc tìm số thiếu (`3 + ? = 8`), **2–4 số hạng** (nhân trước, cộng trừ sau, không ra số âm).
- **Hình ảnh** cho bé mới học: đếm táo, gà con, bóng bay… thay cho số.
- **Cú Tí** hướng dẫn sử dụng lần đầu (bấm nút dấu hỏi để xem lại) và nhận xét sau mỗi bài.
- Chuỗi ngày luyện tập, kỷ lục cá nhân, luyện lại câu sai, biểu đồ 7 ngày.

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

## Ghi công

- Toàn bộ hình minh hoạ, icon giao diện và NPC Cú Tí: [Microsoft Fluent Emoji 3D](https://github.com/microsoft/fluentui-emoji) (MIT), xem `www/img/CREDITS.txt`.
- Hiệu ứng: [GSAP](https://gsap.com). Biểu đồ: [Chart.js](https://www.chartjs.org) (MIT).
- Font: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) (SIL OFL).
