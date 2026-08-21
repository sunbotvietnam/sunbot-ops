# UX/UI Sunbot School Development OS V2

## Nguyên tắc trải nghiệm
- 100% tiếng Việt trên giao diện người dùng.
- Mỗi màn có một nhiệm vụ chính.
- Không dùng dashboard chỉ để trang trí; mọi chỉ số phải click được tới record hành động.
- Trạng thái dùng màu tiết chế, không tô cả card.
- Next Action luôn nổi bật hơn metadata.
- Form dài được chia bước; không bắt người dùng nhập lại thông tin đã có.
- Tối đa 2 click từ danh sách School tới hành động chính.

## Information architecture
### Điều hướng chính
1. **Hôm nay** – việc đến hạn/quá hạn/meeting.
2. **Trường** – danh sách account theo quyền.
3. **Cơ hội** – chỉ Opportunity đủ điều kiện.
4. **Quản trị** – chỉ Admin/Leader khi có quyền.

## Màn Hôm nay
Hero: “Chào [Tên], đây là việc cần ưu tiên hôm nay.”
- Quá hạn
- Đến hạn hôm nay
- Chờ phản hồi
- Meeting sắp tới

Danh sách action compact:
School · Việc tiếp theo · hạn · trạng thái · nút Mở.

## Màn Trường
- Search nhanh.
- Filter: owner, địa bàn, relationship state, overdue/no-next-action.
- Card/table hybrid; desktop ưu tiên table compact, mobile chuyển card.
- Một hàng luôn có School, Owner, State, Next Action, Due.

## School Workspace
Header: tên trường + địa bàn + owner + relationship state.
Khối nổi bật: **Việc tiếp theo**.
Primary actions:
- Ghi nhận tương tác
- Đặt việc tiếp theo
- Bắt đầu Discovery
- Tạo cơ hội (chỉ khi đủ điều kiện)
Timeline phía dưới.

## Discovery Wizard
6 bước:
1. Bối cảnh
2. E-profile
3. Catalogue / lựa chọn
4. Khám phá nhu cầu
5. Need Statement
6. Kết quả + Next Action

## Opportunity
- Need Statement (read-only từ Discovery)
- Solution direction
- Stage
- Expected value (Phase sau)
- Proposal status
- Decision

## Visual system
- Nền: #F5F8FC
- Surface: #FFFFFF
- Primary navy: #12345B
- Sunbot blue: #1D6FE8
- Accent cyan: #27A9E1
- Success: #168A53
- Warning: #C97A12
- Danger: #C43D3D
- Text: #172033
- Muted: #667085
- Border: #DCE5F0

Typography: Inter/Arial/Segoe UI fallback; headline đậm vừa, không ALL CAPS trừ eyebrow nhỏ.
Border radius 14–18px; shadow rất nhẹ; khoảng trắng rõ.
Logo Sunbot chuẩn hiển thị trong topbar/login, không dùng chữ S giả lập.

## Microcopy
- “Việc tiếp theo” thay vì “Task”.
- “Ghi nhận tương tác” thay vì “Log activity”.
- “Khám phá nhu cầu” thay vì “Discovery” ở UI chính; thuật ngữ Discovery chỉ xuất hiện ở mô tả nội bộ khi cần.
- “Cơ hội” thay Opportunity.
- “Đề xuất” thay Proposal nếu phù hợp; tên tài liệu chính thức vẫn “Proposal Sunbot” khi xuất PDF.
