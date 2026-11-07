# Luyện tiếng Anh

Web học tiếng Anh một trang (index.html): Luyện từ (thẻ ghi nhớ, trắc nghiệm, nghe viết, ghép từ, ôn tập lặp lại ngắt quãng) và Luyện đề (IELTS, Tiếng Anh phổ thông), có hồ sơ riêng cho từng học viên và trang giáo viên.

- Học viên: đăng nhập bằng mã học viên (HVxxxx).
- Giáo viên: tab "Giáo viên", PIN mặc định 1234 (đổi trong mục Dữ liệu).
- Dữ liệu lưu trong trình duyệt của từng máy. Nếu điền cấu hình Firebase vào `assets/firebase-config.js`, dữ liệu tự đồng bộ online (Firestore) để giáo viên và học viên thấy nhau trên mọi máy; nếu không, dùng "Xuất/Nhập file" để chuyển bài và kết quả.

## Bật đồng bộ online (Firebase, miễn phí)

1. Vào https://console.firebase.google.com, đăng nhập Google, bấm "Create a project" (tắt Google Analytics cũng được).
2. Trong dự án: Build > Firestore Database > Create database > chọn vị trí (ví dụ asia-southeast1) > Start in production mode.
3. Tab Rules: dán nội dung file `firestore.rules` rồi bấm Publish.
4. Project settings (bánh răng) > Your apps > biểu tượng Web `</>` > đặt tên > Register app. Sao chép đoạn `firebaseConfig`.
5. Dán vào `assets/firebase-config.js` thay cho `window.FB_CONFIG = null;`.

Lưu ý: app chưa có đăng nhập thật bằng mật khẩu, nên ai biết địa chỉ trang đều có thể đọc dữ liệu lớp (tên học viên, kết quả). Không nên lưu thông tin nhạy cảm.
