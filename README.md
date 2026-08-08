# SUNBOT OPS

Hệ thống vận hành nội bộ Kiro/Sunbot theo kiến trúc **GitHub + Google Drive ecosystem**.

## Kiến trúc hiện tại

- **GitHub**: source code, tài liệu, schema, branch/PR, CI/CD.
- **Google Apps Script**: Web App, frontend, backend, business logic, automation.
- **Google Sheets**: database vận hành.
- **Google Drive**: hồ sơ/tài liệu/bằng chứng.
- **Authentication V1**: session signed server-side; production hiện dùng luồng đăng nhập được cấu hình trong Apps Script.

Không cần PostgreSQL, Docker hoặc server Node cho V1.

## Production hiện tại

- Database: `SUNBOT_OPS_DATABASE`.
- Drive: `SUNBOT OPS`.
- Deployment ID được pin tại `apps-script/.production-deployment-id` để URL không đổi qua các lần redeploy.

## Chức năng V1

- Trang chủ nhân viên.
- Cập nhật nhanh.
- Công việc của tôi.
- Trường & đơn vị.
- Báo cáo tuần tự tổng hợp.
- Quản trị nhân sự và vai trò.
- Một nhân sự có thể có nhiều vai trò.
- `AI_FEED` phục vụ Bản tin điều hành Sunbot.

## Commercial Intelligence v2

Commercial Intelligence được bổ sung theo hướng additive, không thay V1:

- School → `TRUONG`.
- Opportunity → `CO_HOI`.
- Sales Action → `CAP_NHAT` + `CONG_VIEC`.
- Market Signal → `THI_TRUONG_TIN_HIEU`.
- Competitor / Market Actor → `DOI_THU`.
- Market Offer → `CHAO_BAN_THI_TRUONG`.
- KPI → derived từ dữ liệu canonical, không nhập tay.

Web App có một module gọn **Thị trường & Cơ hội** gồm:

1. Ghi nhận thị trường — sale ghi raw signal, nguồn và bằng chứng;
2. Cơ hội — quản lý opportunity theo trường;
3. KPI — coverage, follow-up hygiene, work evidence, pipeline và intelligence contribution.

Raw Market Signal không tự động trở thành fact. Chỉ signal được reviewer xác nhận mới được chuẩn hóa vào `AI_FEED`.

## Cấu trúc repo

```text
sunbot-ops/
├─ apps-script/
│  ├─ appsscript.json
│  ├─ Auth.gs
│  ├─ Code.gs
│  ├─ CommercialIntelligence.gs
│  ├─ Production.gs
│  ├─ Index.html
│  ├─ Styles.html
│  ├─ Scripts.html
│  ├─ CommercialUi.html
│  ├─ OtpAuth.html
│  └─ .production-deployment-id
├─ schema/
├─ docs/
├─ scripts/
└─ .github/workflows/
```

## Quy trình Codex/ChatGPT

1. Tạo branch.
2. Đọc `docs/AI_CONTEXT.md` và `docs/COMMERCIAL_INTELLIGENCE_DATA_ARCHITECTURE.md`.
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
- KPI là derived data, không self-report.
- Signal, Fact, Insight là ba lớp riêng biệt.
- Mọi intelligence phải truy ngược được về `source_type` / `source_id`.
- Không commit credential, session secret, Intelligence token hoặc dữ liệu cá nhân vào GitHub.

## Intelligence

Endpoint chuẩn hóa được giữ trong backend để phục vụ CEO briefing; raw database không được trả ra ngoài.
