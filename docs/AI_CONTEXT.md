# AI_CONTEXT – dành cho Codex/ChatGPT

Đây là SUNBOT OPS theo kiến trúc **GitHub + Google Drive ecosystem**.

## Production hiện tại
- Source: GitHub `sunbotvietnam/sunbot-ops`.
- Runtime: Google Apps Script Web App, execute as deployer.
- Production URL được ghi trong `docs/PRODUCTION_OWNER.md` và `docs/GOOGLE_ARCHITECTURE.md`.
- Data: Google Sheets `SUNBOT_OPS_DATABASE` trong `SUNBOT OPS/00_SYSTEM`.
- File/bằng chứng: Google Drive.
- Session auth được ký server-side; không lưu credential trong source.
- Deployment ID được pin trong `apps-script/.production-deployment-id`; GitHub Actions redeploy đúng URL production sau merge.

## Không được phá các nguyên tắc sau
1. Không hard-code tên nhân sự vào business logic.
2. Một user có thể có nhiều role; quyền đi qua NHAN_SU_VAI_TRO → QUYEN_VAI_TRO.
3. Nhân viên không thao tác trực tiếp Google Sheet.
4. Frontend gọi backend vận hành qua session API; không đọc/ghi Sheet trực tiếp.
5. UI ưu tiên tiếng Việt và mobile-first.
6. Một cập nhật bắt buộc có kết quả, việc tiếp theo và deadline.
7. “Đã gọi”, “đang follow” không được coi là kết quả hoàn chỉnh.
8. TRUONG và CO_HOI là hai entity khác nhau.
9. Không đổi tên/xóa cột Sheet tùy tiện; thay schema phải cập nhật `schema/sheets-schema.json`.
10. Không commit credential, session secret, Intelligence token hoặc dữ liệu cá nhân vào GitHub.
11. Intelligence endpoint chỉ trả dữ liệu đã chuẩn hóa, không trả raw database.
12. Mọi thay đổi quan trọng phải qua branch + PR và chạy CI validation.
13. KPI là derived data; không tạo form self-report KPI nếu dữ liệu đã có trong hệ thống.
14. Signal, Fact và Insight là ba lớp khác nhau. Raw Market Signal không được tự nâng thành fact.
15. Mọi CEO intelligence phải truy ngược được về `source_type` và `source_id`.

## Commercial Intelligence v2
Đọc `docs/COMMERCIAL_INTELLIGENCE_DATA_ARCHITECTURE.md` trước khi sửa phần sale/market/KPI.

Canonical sources:
- School master → `TRUONG`
- Opportunity → `CO_HOI`
- Future action/deadline → `CONG_VIEC`
- Completed interaction → `CAP_NHAT`
- Cash truth → `CONG_NO`
- Raw market signal → `THI_TRUONG_TIN_HIEU`
- Competitor baseline → `DOI_THU`
- Market offer baseline → `CHAO_BAN_THI_TRUONG`
- CEO normalized signals → `AI_FEED`
- Audit → `AUDIT_LOG`

Nhân viên sale chỉ nhập raw signal/source/evidence. Reviewer mới được nhập `verified_fact` và `confidence`.

## Khi Codex/ChatGPT được yêu cầu sửa
- đọc README.md, docs/GOOGLE_ARCHITECTURE.md, docs/PRODUCTION_OWNER.md, docs/COMMERCIAL_INTELLIGENCE_DATA_ARCHITECTURE.md và schema/*.json trước;
- tạo branch riêng;
- cập nhật schema/docs nếu business logic thay đổi;
- chạy validation;
- mở PR;
- không ghi secret vào source.

## V1 + Commercial v2 scope
- Session login;
- Trang chủ;
- Cập nhật nhanh;
- Công việc;
- Trường;
- Báo cáo tuần;
- quản trị nhân sự/role;
- AI_FEED + Intelligence endpoint;
- Market Signal;
- Opportunity;
- KPI derived;
- module UI `Thị trường & Cơ hội`.

Commission, CRM automation sâu, đồng bộ Gmail/Calendar vẫn là phase sau.
