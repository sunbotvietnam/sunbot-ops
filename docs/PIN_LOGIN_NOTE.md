# SUNBOT OPS – Đăng nhập PIN

GitHub Pages sử dụng email công việc + mã PIN 4 số cho tài khoản nhân viên đã được cấp quyền trong `NHAN_SU`.

- PIN không được lưu dạng rõ trong source code.
- Backend chỉ lưu SHA-256 hash có salt trong `PasswordAuth.gs`.
- Sau 5 lần nhập sai, tài khoản bị khóa tạm thời 15 phút.
- Phiên đăng nhập vẫn dùng session token có thời hạn và được xác minh lại với trạng thái nhân sự trong database.

Luồng OTP cũ vẫn tồn tại trong backend để tương thích kỹ thuật nhưng không còn là màn đăng nhập mặc định của GitHub Pages.
