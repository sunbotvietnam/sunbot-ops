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
Script ID được cấu hình trực tiếp trong workflow; credential clasp vẫn phải giữ trong GitHub Secret `CLASPRC_JSON`.

## Trạng thái cutover 2026-08-08
Migration code/Drive/Sheet đã chuyển sang owner mới và PR migration đã merge. Lần deploy đầu tiên tới Apps Script project mới bị Google từ chối với `The caller does not have permission` vì `CLASPRC_JSON` trên GitHub vẫn là credential của owner cũ. Cần đăng nhập clasp một lần bằng `tuongvan1906@gmail.com` và thay GitHub Secret `CLASPRC_JSON`, sau đó rerun workflow. Không cần sửa Script ID hay `CLASP_JSON`.

## Bảo mật
Không commit refresh token, session secret, Intelligence token hoặc dữ liệu cá nhân vào repository.

Nếu sau này chuyển sang Google Workspace/Shared Drive, giữ nguyên schema và business logic; chỉ chuyển ownership/storage.
