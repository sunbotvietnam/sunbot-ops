# SUNBOT OPS

Hệ thống vận hành nội bộ Kiro/Sunbot theo kiến trúc **GitHub + Google Drive ecosystem**.

## Kiến trúc hiện tại

- **GitHub**: source code, tài liệu, schema, branch/PR, CI/CD.
- **Google Apps Script**: Web App, frontend, backend, business logic, automation.
- **Google Sheets**: database vận hành.
- **Google Drive**: hồ sơ/tài liệu/bằng chứng.
- **Authentication V1**: passwordless email OTP gửi tới email ACTIVE trong `NHAN_SU`; backend phát session token HMAC-SHA256 12 giờ.

Không cần PostgreSQL, Docker, server Node hoặc Google Cloud OAuth Client ID cho V1.

## Production hiện tại

- Google owner: `hrmanager.kiro@gmail.com`.
- Drive: `SUNBOT OPS`.
- Database: `SUNBOT_OPS_DATABASE`.
- Web App: `https://script.google.com/macros/s/AKfycbw23iMjAMi2Ed-OgSwbQQfgdFRwVmrb04Br4ihOqQuz4VOsq09nfsx46Kp--3qzyFg4/exec`.
- Deployment ID được pin tại `apps-script/.production-deployment-id` để URL không đổi qua các lần redeploy.

## Chức năng V1

- Trang chủ nhân viên.
- Cập nhật nhanh.
- Công việc của tôi.
- Trường & đơn vị.
- Báo cáo tuần tự tổng hợp.
- Quản trị nhân sự và vai trò.
- Một nhân sự có thể có nhiều vai trò.
- AI_FEED phục vụ Bản tin điều hành Sunbot.

## Cấu trúc repo

```text
sunbot-ops/
├─ apps-script/
│  ├─ appsscript.json
│  ├─ Auth.gs
│  ├─ Code.gs
│  ├─ Production.gs
│  ├─ Index.html
│  ├─ Styles.html
│  ├─ Scripts.html
│  ├─ OtpAuth.html
│  └─ .production-deployment-id
├─ schema/
├─ docs/
├─ scripts/
└─ .github/workflows/
```

## Quy trình Codex/ChatGPT

1. Tạo branch.
2. Đọc `docs/AI_CONTEXT.md`.
3. Sửa code/schema/docs.
4. Chạy CI validation.
5. Mở Pull Request.
6. Merge khi CI pass.
7. GitHub Actions tự `clasp push`, tạo version và redeploy đúng Web App production.

## Nguyên tắc dữ liệu và bảo mật

- Không hard-code tên nhân sự.
- Nhân viên không sửa Sheet trực tiếp.
- Một cập nhật phải có kết quả, việc tiếp theo và deadline.
- Trường và cơ hội kinh doanh là hai entity khác nhau.
- Một người có thể có nhiều role theo thời gian.
- Không commit refresh token, OTP, session secret, Intelligence token hoặc dữ liệu cá nhân vào GitHub.

## Intelligence

Endpoint chuẩn hóa vẫn được giữ trong backend để phục vụ CEO briefing; raw database không được trả ra ngoài.
