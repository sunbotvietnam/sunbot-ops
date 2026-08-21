# Kiến trúc Sunbot School Development OS V2

## Luồng nghiệp vụ canonical
School → Interaction → Next Action → Discovery → Opportunity → Proposal → Decision

## Quy tắc dữ liệu
1. School master chỉ nằm ở `SCHOOLS`.
2. Interaction là lịch sử bất biến trong `INTERACTIONS`.
3. Next Action hiện hành lấy từ `NEXT_ACTIONS` với `status=OPEN`; không lưu bản sao ở School.
4. Discovery là nguồn duy nhất của Need Statement.
5. Opportunity chỉ được tạo khi Discovery có `outcome=CREATE_OPPORTUNITY` và Need Statement hợp lệ.
6. Proposal chỉ được tạo từ Opportunity.
7. Decision được ghi trên Proposal/Opportunity và có reason bắt buộc nếu không Won.
8. Audit chỉ ghi thay đổi hệ thống/quyền/giao việc, không thay thế Interaction.

## School relationship state
- TARGET: đã xác định là account mục tiêu.
- CONTACTED: đã có tiếp cận thực tế.
- ENGAGED: trường phản hồi/quan tâm.
- DISCOVERY: đã hẹn hoặc đang làm rõ nhu cầu.
- OPPORTUNITY: đã có cơ hội đủ điều kiện.
- CUSTOMER: đã chốt hợp tác.
- NURTURE: chưa đúng thời điểm nhưng đáng quay lại.
- CLOSED: không tiếp tục.

## Opportunity stage
QUALIFIED → SOLUTION → PROPOSAL → NEGOTIATION → DECISION → WON/LOST

## Điều kiện chuyển bước
- TARGET → CONTACTED: có Interaction thật.
- CONTACTED → ENGAGED: có phản hồi hoặc cuộc hẹn.
- ENGAGED → DISCOVERY: có meeting/discovery được xác nhận.
- DISCOVERY → OPPORTUNITY: Need Statement + fit + next step rõ.
- OPPORTUNITY → PROPOSAL: solution direction đã xác nhận và quotation hợp lệ.
- PROPOSAL → DECISION: proposal đã duyệt và gửi.

## Permission matrix
### ADMIN / CEO
- Xem toàn bộ.
- Tạo/sửa user, reset password.
- Giao School cho Leader/Staff.
- Override owner/state/decision.
- Duyệt Proposal.

### LEADER
- Xem School do mình quản lý và Staff dưới quyền.
- Thêm School.
- Giao School cho Staff thuộc mình.
- Không giao ngược lên Admin.
- Có thể được bật quyền duyệt Proposal của Staff.

### STAFF
- Xem School mình sở hữu/được giao.
- Thêm School cho chính mình.
- Ghi Interaction, Next Action, Discovery, Opportunity, Draft Proposal.
- Không giao School cho Leader/Admin hay Staff khác.

## UX rule
- Màn đầu không tải analytics nặng.
- `Hôm nay` và `Trường` usable trước; analytics tải sau.
- Một thao tác write chỉ tạo tối đa một request chính; UI cập nhật optimistic khi an toàn.
- Không monkey-patch giữa module.
- Không có modal lồng modal.
