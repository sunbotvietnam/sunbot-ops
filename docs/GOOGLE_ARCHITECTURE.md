# SUNBOT OPS – Kiến trúc Google-native

## Mục tiêu
SUNBOT OPS dùng hai nền tảng vận hành chính:

1. **GitHub** – source code, tài liệu, lịch sử thay đổi, Pull Request và CI/CD.
2. **Google Drive ecosystem** – Apps Script Web App + Google Sheets + Google Drive folders + triggers.

Không cần PostgreSQL, Docker, VPS, server Node hoặc Google Cloud OAuth Client ID cho V1.

## Runtime

```text
Người dùng
   ↓ email + OTP
Apps Script Web App (execute as deployer)
   ├─ Frontend HTML/CSS/JS
   ├─ Passwordless email OTP
   ├─ HMAC session token
   ├─ Permission engine
   ↓
Google Sheets database
   ↓
Drive folders / tài liệu
   ↓
AI_FEED
```

## Authentication V1
- Chỉ email có trạng thái ACTIVE trong `NHAN_SU` mới được gửi OTP.
- OTP 6 số, thời hạn 10 phút, giới hạn số lần nhập và resend.
- OTP chỉ lưu dạng HMAC trong CacheService, không lưu plaintext.
- Session token có thời hạn 12 giờ và được ký HMAC-SHA256 bằng secret trong Script Properties.
- Frontend lưu session token cục bộ và gửi qua `apiSession(...)`.
- Web App chạy dưới quyền deployer nên nhân viên không cần quyền trực tiếp với Google Sheets/Drive.

## Production owner hiện tại
Tài khoản Google sở hữu hệ thống: `hrmanager.kiro@gmail.com`.

Drive production đã có:
- folder `SUNBOT OPS`;
- các folder `00_SYSTEM`, `01_TRUONG_DOI_TAC`, `02_HO_SO_THANH_TOAN`, `03_DE_XUAT_HOP_DONG`, `04_MINH_CHUNG`, `05_BAO_CAO`, `99_BACKUP`;
- Google Sheet `SUNBOT_OPS_DATABASE` đặt trong `00_SYSTEM`;
- schema V1 gồm NHAN_SU, VAI_TRO, NHAN_SU_VAI_TRO, QUYEN_VAI_TRO, TRUONG, CO_HOI, CONG_VIEC, CAP_NHAT, VAN_DE, CONG_NO, BAO_CAO_TUAN, AI_FEED, AUDIT_LOG;
- user khởi tạo `hrmanager.kiro@gmail.com` với role ADMIN + CEO;
- role/permission cơ bản đã được seed.

## Web App production
URL production:
`https://script.google.com/macros/s/AKfycbw23iMjAMi2Ed-OgSwbQQfgdFRwVmrb04Br4ihOqQuz4VOsq09nfsx46Kp--3qzyFg4/exec`

Deployment ID được pin trong `apps-script/.production-deployment-id`. Sau mỗi merge có thay đổi `apps-script/**`, GitHub Actions tự:
1. `clasp push` source;
2. tạo immutable version;
3. redeploy đúng deployment production hiện hữu.

## Khởi tạo lại môi trường mới
Nếu dựng một production mới hoàn toàn, chạy `setupSystem(ownerEmail)`. Với production hiện tại không chạy lại hàm này vì database/folder đã tồn tại.

## Báo cáo tuần và intelligence
Báo cáo tuần được tổng hợp từ dữ liệu vận hành. `AI_FEED` là lớp dữ liệu chuẩn hóa cho Bản tin điều hành, không yêu cầu AI đọc raw database.

## Backup và bảo mật
- Source code: GitHub.
- Operational data: Google Sheets/Drive.
- Sheet có version history; `99_BACKUP` dành cho snapshot.
- Không commit refresh token, OTP, session secret, Intelligence token hoặc dữ liệu cá nhân vào repository.

## Chuyển ownership trong tương lai
Nếu Kiro/Sunbot chuyển sang Google Workspace/Shared Drive, giữ nguyên schema và business logic; chỉ thay ownership/storage adapter khi cần.
