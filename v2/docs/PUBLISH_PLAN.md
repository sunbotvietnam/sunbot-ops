# Publish plan

V2 được publish additive, không thay app cũ:

- Frontend thử nghiệm: `https://sunbotvietnam.github.io/sunbot-ops/v2/`
- Backend: route `mode=v2` trên Apps Script production deployment hiện hữu.
- Data: `SUNBOT_SCHOOL_OS_DB_V2` hoàn toàn riêng.

Sau khi Phase 1 E2E pass:
1. Migrate School active có chọn lọc.
2. Cho Nhung/Dung/Thu test thật trong V2.
3. Chỉ khi ổn mới cân nhắc đổi URL chính hoặc tách repo/deployment riêng.
