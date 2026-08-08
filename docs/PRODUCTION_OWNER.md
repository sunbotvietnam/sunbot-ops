# SUNBOT OPS – Production Owner

Tài khoản Google production hiện tại: `hrmanager.kiro@gmail.com`.

## Tài sản production đã tạo
- Drive root: `SUNBOT OPS`
- System folder: `00_SYSTEM`
- Database: `SUNBOT_OPS_DATABASE`
- Schema V1 đã tạo đủ 13 sheet nghiệp vụ.
- User khởi tạo: `hrmanager.kiro@gmail.com`
- Role khởi tạo: `ADMIN` + `CEO`
- Apps Script Web App deployment ID được pin tại `apps-script/.production-deployment-id`.
- Production Web App URL: `https://script.google.com/macros/s/AKfycbw23iMjAMi2Ed-OgSwbQQfgdFRwVmrb04Br4ihOqQuz4VOsq09nfsx46Kp--3qzyFg4/exec`

## Authentication V1
SUNBOT OPS dùng passwordless email OTP. Chỉ email ACTIVE trong `NHAN_SU` được nhận mã; OTP không lưu plaintext; session token được ký HMAC-SHA256 phía server. Không cần Google Cloud OAuth Client ID cho V1.

## Bảo mật
Không commit refresh token, session secret, Intelligence token, OTP hoặc dữ liệu cá nhân vào repository. Deployment ID/URL là định danh xuất bản, không phải credential.

Nếu sau này chuyển sang Google Workspace/Shared Drive, giữ nguyên schema và business logic; chỉ chuyển ownership/storage.
