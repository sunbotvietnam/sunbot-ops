# Trạng thái triển khai V2

## Đã làm
- Tạo database mới `SUNBOT_SCHOOL_OS_DB_V2`.
- Tạo schema: USERS, ROLES, SCHOOLS, INTERACTIONS, NEXT_ACTIONS, DISCOVERIES, OPPORTUNITIES, PROPOSALS, DOCUMENTS, AUDIT_LOG, SETTINGS.
- Seed 7 tài khoản hiện tại.
- Tạo nhánh GitHub độc lập `v2/sunbot-school-os`.
- Định nghĩa architecture, state machine, permission matrix, UX/UI.
- Xây frontend publishable tại `frontend/v2/` cho Phase 1: Login, Hôm nay, Trường, School Workspace, Interaction, Next Action, Admin read-only user list.
- Xây backend V2 additive trong `apps-script/V2SchoolOS.gs`, sử dụng database V2 riêng.

## Còn trước khi publish test
- Nối `mode=v2` vào PagesBridge.
- Merge nhánh V2 vào main theo cách additive.
- Deploy GitHub Pages + Apps Script.
- E2E test theo `PHASE1_ACCEPTANCE.md`.
- Migrate có chọn lọc School active từ database cũ.

## Chưa làm theo nguyên tắc khóa phase
- Discovery Wizard.
- Opportunity lifecycle.
- Proposal/Quotation.
- Decision.
- Expected revenue.

Các phần này chỉ bắt đầu sau khi Phase 1 E2E pass.
