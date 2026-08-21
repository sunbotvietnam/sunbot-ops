# SUNBOT SCHOOL DEVELOPMENT OS V2

Mục tiêu: một hệ thống vận hành phát triển trường học gọn, nhanh và nhất quán theo luồng:

**School → Interaction → Next Action → Discovery → Opportunity → Proposal → Decision**

## Nguyên tắc
- Giao diện 100% tiếng Việt.
- Mỗi sự thật chỉ có một nguồn dữ liệu canonical.
- School + Next Action là lõi vận hành.
- Interaction là lịch sử bất biến; Audit là dấu vết hệ thống, không trộn lẫn.
- Discovery là điều kiện để tạo Opportunity.
- Proposal chỉ sinh từ Opportunity và phải qua approval theo quyền.
- Không thêm module ngoài luồng chính trong MVP.
- Không phát triển phase sau khi phase trước chưa E2E pass production.

## Database production V2
`SUNBOT_SCHOOL_OS_DB_V2`

## Phase 1
Login → Hôm nay → Trường → Hồ sơ trường → Interaction → Next Action.
