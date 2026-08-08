# SUNBOT OPS

Hệ thống vận hành nội bộ Kiro/Sunbot theo kiến trúc **GitHub + Google Drive ecosystem**.

## Kiến trúc hiện tại

- **GitHub**: source code, tài liệu, schema, branch/PR, CI.
- **Google Apps Script**: web app, frontend, backend, business logic, automation.
- **Google Sheets**: database vận hành.
- **Google Drive**: hồ sơ/tài liệu/bằng chứng.
- **Google Identity Services**: đăng nhập bằng tài khoản Google.

Không cần PostgreSQL, Docker hoặc server Node cho V1.

## Chức năng V1

- Trang chủ nhân viên.
- Cập nhật nhanh.
- Công việc của tôi.
- Trường & đơn vị.
- Báo cáo tuần tự tổng hợp.
- Quản trị nhân sự và vai trò.
- Một nhân sự có thể có nhiều vai trò.
- AI_FEED và endpoint dành cho Bản tin điều hành Sunbot.

## Cấu trúc repo

```text
sunbot-ops/
├─ apps-script/
│  ├─ appsscript.json
│  ├─ Code.gs
│  ├─ Index.html
│  ├─ Styles.html
│  └─ Scripts.html
├─ schema/
│  ├─ sheets-schema.json
│  └─ roles.json
├─ docs/
│  ├─ AI_CONTEXT.md
│  └─ GOOGLE_ARCHITECTURE.md
├─ scripts/
│  └─ validate.mjs
└─ .github/workflows/ci.yml
```

## Khởi tạo production

Đọc `docs/GOOGLE_ARCHITECTURE.md`.

Lệnh khởi tạo chính trong Apps Script:

```javascript
setupSystem('tuongvan1906@gmail.com')
```

Sau đó cấu hình Google OAuth Client ID và Intelligence token:

```javascript
configureSecrets('YOUR_CLIENT_ID.apps.googleusercontent.com', 'YOUR_LONG_RANDOM_TOKEN')
```

Deploy Apps Script thành Web App, chạy dưới quyền người sở hữu hệ thống.

## Đồng bộ source với Apps Script bằng clasp

Tạo Apps Script project trước, lấy Script ID, rồi tạo `.clasp.json` từ mẫu:

```bash
cp .clasp.json.example .clasp.json
npx @google/clasp login
npx @google/clasp push
```

`.clasp.json` không nên commit nếu chứa Script ID production không muốn công khai.

## Quy trình Codex/ChatGPT

1. Tạo branch.
2. Đọc `docs/AI_CONTEXT.md`.
3. Sửa code/schema.
4. Chạy `node scripts/validate.mjs`.
5. Mở Pull Request.
6. Merge sau khi CI pass.
7. `clasp push`/deploy Apps Script.

## Nguyên tắc dữ liệu

- Không hard-code tên nhân sự.
- Nhân viên không sửa Sheet trực tiếp.
- Một cập nhật phải có kết quả, việc tiếp theo và deadline.
- Trường và cơ hội kinh doanh là hai entity khác nhau.
- Thêm giáo viên làm sale bằng cách **gán thêm role MARKET**, không tạo user mới.

## Intelligence

Endpoint:

```text
<WEB_APP_URL>?action=intelligence&token=<TOKEN>&hours=24
```

Output chuẩn hóa thành 5 nhóm phục vụ CEO briefing:
- CEO Attention
- Market Changes
- Cash Signals
- Execution Risks
- Deadlines
