# SUNBOT OPS – Kiến trúc Google-native

## Mục tiêu
SUNBOT OPS chỉ dùng hai nền tảng vận hành chính:

1. **GitHub** – nguồn sự thật duy nhất của source code, tài liệu, lịch sử thay đổi và Pull Request.
2. **Google Drive ecosystem** – Apps Script Web App + Google Sheets + Google Drive folders + triggers.

Không cần PostgreSQL, Docker, VPS hay server Node cho V1.

## Runtime

```text
Người dùng
   ↓ Google Sign-In
Apps Script Web App
   ├─ Frontend HTML/CSS/JS
   ├─ Business logic
   ├─ Google token verification
   ├─ Permission engine
   ↓
Google Sheets database
   ↓
Drive folders / tài liệu
   ↓
AI_FEED
   ↓
Intelligence HTTP endpoint
```

## Vì sao vẫn là Frontend + Backend
Frontend nằm trong `Index.html`, `Styles.html`, `Scripts.html`.
Backend nằm trong `Code.gs` và không cho frontend thao tác Sheet trực tiếp.
Mọi thao tác đi qua hàm `api(idToken, action, payload)`.

## Production owner hiện tại
Tài khoản Google sở hữu hệ thống: `hrmanager.kiro@gmail.com`.

Drive production hiện đã có:
- folder `SUNBOT OPS`;
- thư mục hệ thống và các thư mục nghiệp vụ;
- Google Sheet `SUNBOT_OPS_DATABASE`;
- schema V1 gồm NHAN_SU, VAI_TRO, NHAN_SU_VAI_TRO, QUYEN_VAI_TRO, TRUONG, CO_HOI, CONG_VIEC, CAP_NHAT, VAN_DE, CONG_NO, BAO_CAO_TUAN, AI_FEED, AUDIT_LOG;
- user khởi tạo `hrmanager.kiro@gmail.com` với role ADMIN + CEO;
- các role và permission cơ bản.

## Khởi tạo lại môi trường mới

1. Tạo Apps Script project mới trong tài khoản sở hữu hệ thống.
2. Dùng `clasp` hoặc copy source trong thư mục `apps-script/` lên project.
3. Trong Apps Script editor chạy:

```javascript
setupSystem('hrmanager.kiro@gmail.com')
```

Hàm này tự tạo:
- folder `SUNBOT OPS`;
- `SUNBOT_OPS_DATABASE`;
- toàn bộ sheet schema;
- vai trò và quyền;
- user CEO/Admin đầu tiên;
- trigger tạo draft báo cáo vào thứ Bảy 08:00.

> Với production hiện tại, database đã được tạo sẵn nên không chạy lại `setupSystem()` trừ khi dựng một môi trường mới.

## Google Login
Tạo OAuth 2.0 Client ID loại **Web application** trong Google Cloud project dùng cho Apps Script.
Sau đó chạy:

```javascript
configureSecrets('GOOGLE_CLIENT_ID.apps.googleusercontent.com', 'mot-token-dai-ngau-nhien')
```

Web App nên deploy:
- Execute as: **Me / user deploying**
- Who has access: **Anyone** hoặc phạm vi phù hợp

Ứng dụng vẫn an toàn vì mỗi API call đều bắt buộc gửi Google ID token và backend kiểm tra email trong `NHAN_SU`.

## Thêm giáo viên lên làm sale
Không tạo user mới.
Trong màn Admin, user giữ nguyên ID; thêm role `MARKET` bên cạnh `TEACHER`.
Lịch sử giáo viên cũ không mất.

## Intelligence endpoint

```text
<WEB_APP_URL>?action=intelligence&token=<INTELLIGENCE_TOKEN>&hours=24
```

Output chỉ gồm tín hiệu đã chuẩn hóa cho CEO briefing, không trả raw database.

## Backup
- Sheet/database nằm trong Drive và có version history.
- Folder `99_BACKUP` dành cho snapshot định kỳ sau này.
- Source code luôn nằm trên GitHub.

## Chuyển ownership trong tương lai
Nếu Kiro/Sunbot chuyển sang Google Workspace/Shared Drive, có thể chuyển tài sản sang Shared Drive mà không đổi business logic hay schema.
