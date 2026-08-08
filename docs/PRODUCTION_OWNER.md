# SUNBOT OPS – Production Owner

Tài khoản Google production hiện tại: `tuongvan1906@gmail.com`.

## Tài sản production mới
- Drive root: `SUNBOT OPS`
- System folder: `00_SYSTEM`
- Database: `SUNBOT_OPS_DATABASE`
- Schema V1 gồm đủ 13 sheet nghiệp vụ.
- User khởi tạo: `tuongvan1906@gmail.com`
- Role khởi tạo: `ADMIN` + `CEO`
- Auth V1: passwordless email OTP.

## Apps Script production
Apps Script project production mới được tạo dưới `tuongvan1906@gmail.com` và được deploy từ GitHub Actions qua clasp.
Script ID có thể lưu trong cấu hình repo; credential clasp vẫn phải giữ trong GitHub Secret `CLASPRC_JSON`.

## Bảo mật
Không commit refresh token, session secret, Intelligence token hoặc dữ liệu cá nhân vào repository.

Nếu sau này chuyển sang Google Workspace/Shared Drive, giữ nguyên schema và business logic; chỉ chuyển ownership/storage.
