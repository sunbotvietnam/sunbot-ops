# AI_CONTEXT – dành cho Codex/ChatGPT

Đây là SUNBOT OPS theo kiến trúc **GitHub + Google Drive ecosystem**.

## Không được phá các nguyên tắc sau
1. Không hard-code tên Dung, Thu, Hoàng Nhung, Vũ Thảo hoặc bất kỳ nhân sự nào.
2. Một user có thể có nhiều role; quyền đi qua NHAN_SU_VAI_TRO → QUYEN_VAI_TRO.
3. Nhân viên không thao tác trực tiếp Google Sheet.
4. Frontend chỉ gọi backend qua `api(idToken, action, payload)`.
5. UI ưu tiên tiếng Việt và mobile-first.
6. Một cập nhật bắt buộc có kết quả, việc tiếp theo và deadline.
7. “Đã gọi”, “đang follow” không được coi là kết quả hoàn chỉnh.
8. TRUONG và CO_HOI là hai entity khác nhau.
9. Không đổi tên/xóa cột Sheet tùy tiện; thay schema phải cập nhật `schema/sheets-schema.json` và migration/setup tương ứng.
10. Không commit OAuth secret, Intelligence token hoặc ID token vào GitHub.
11. Intelligence endpoint chỉ trả dữ liệu đã chuẩn hóa, không trả raw database.
12. Mọi thay đổi quan trọng phải qua branch + PR và chạy CI validation.

## Khi Codex/ChatGPT được yêu cầu sửa
- đọc README.md, docs/GOOGLE_ARCHITECTURE.md, schema/*.json trước;
- mô tả file sẽ sửa;
- tạo branch riêng;
- cập nhật schema/docs nếu business logic thay đổi;
- chạy `node scripts/validate.mjs`;
- mở PR;
- không push trực tiếp production nếu không được yêu cầu rõ.

## V1 scope
- Google Login;
- Trang chủ;
- Cập nhật nhanh;
- Công việc;
- Trường;
- Báo cáo tuần;
- quản trị nhân sự/role;
- AI_FEED + Intelligence endpoint.

KPI nâng cao, commission, CRM automation sâu, đồng bộ Gmail/Calendar là phase sau.
