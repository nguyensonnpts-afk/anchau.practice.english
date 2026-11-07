// Cấu hình Firebase để giáo viên và học viên dùng chung dữ liệu trên mọi máy.
// Để trống (null) thì app chạy như cũ: dữ liệu chỉ nằm trên trình duyệt của từng máy.
// Cách lấy: Firebase console > Project settings > Your apps > Web app > SDK setup and configuration > Config.
window.FB_CONFIG = null;
/* Ví dụ:
window.FB_CONFIG = {
  apiKey: "AIza...",
  authDomain: "ten-du-an.firebaseapp.com",
  projectId: "ten-du-an",
  storageBucket: "ten-du-an.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
*/
