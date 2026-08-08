# AI_CONTEXT – dành cho Codex/ChatGPT

Đây là SUNBOT OPS theo kiến trúc **GitHub + Google Drive ecosystem**.

## Production hiện tại
- Source: GitHub `sunbotvietnam/sunbot-ops`.
- Google owner: `hrmanager.kiro@gmail.com`.
- Runtime: Google Apps Script Web App, execute as deployer.
- Production URL được ghi trong `docs/PRODUCTION_OWNER.md` và `docs/GOOGLE_ARCHITECTURE.md`.
- Data: Google Sheets `SUNBOT_OPS_DATABASE` trong `SUNBOT OPS/00_SYSTEM`.
- File/bằng chứng: Google Drive.
- Authentication V1: passwordless **email OTP** gửi bằng `MailApp` tới email ACTIVE trong `NHAN_SU`; backend phát session token HMAC-SHA256 12 giờ. Không phụ thuộc Google Cloud OAuth Client ID.
- Deployment ID được pin trong `apps-script/.production-deployment-id`; GitHub Actions redeploy đúng URL production sau merge.

## Không được phá các nguyên tắc sau
1. Không hard-code tên nhân sự vào business logic.
2. Một user có thể có nhiều role; quyền đi qua NHAN_SU_VAI_TRO → QUYEN_VAI_TRO.
3. Nhân viên không thao tác trực tiếp Google Sheet.
4. Frontend gọi backend vận hành qua `apiSession(sessionToken, action, payload)`; không đọc/ghi Sheet trực tiếp.
5. OTP chỉ được gửi cho email ACTIVE trong `NHAN_SU`; không lưu OTP dạng plaintext; session phải được ký server-side.
6. UI ưu tiên tiếng Việt và mobile-first.
7. Một cập nhật bắt buộc có kết quả, việc tiếp theo và deadline.
8. “Đã gọi”, “đang follow” không được coi là kết quả hoàn chỉnh.
9. TRUONG và CO_HOI là hai entity khác nhau.
10. Không đổi tên/xóa cột Sheet tùy tiện; thay schema phải cập nhật `schema/sheets-schema.json`.
11. Không commit credential, session secret, Intelligence token hoặc OTP vào GitHub.
12. Intelligence endpoint chỉ trả dữ liệu đã chuẩn hóa, không trả raw database.
13. Mọi thay đổi quan trọng phải qua branch + PR và chạy CI validation.

## Khi Codex/ChatGPT được yêu cầu sửa
- đọc README.md, docs/GOOGLE_ARCHITECTURE.md, docs/PRODUCTION_OWNER.md, schema/*.json trước;
- tạo branch riêng;
- cập nhật schema/docs nếu business logic thay đổi;
- chạy validation;
- mở PR;
- không ghi secret vào source.

## V1 scope
- Email OTP login;
- Trang chủ;
- Cập nhật nhanh;
- Công việc;
- Trường;
- Báo cáo tuần;
- quản trị nhân sự/role;
- AI_FEED + Intelligence endpoint.

KPI nâng cao, commission, CRM automation sâu, đồng bộ Gmail/Calendar là phase sau.
