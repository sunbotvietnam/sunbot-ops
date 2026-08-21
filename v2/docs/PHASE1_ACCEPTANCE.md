# Phase 1 – Acceptance Criteria

Phase 2 không được bắt đầu trước khi các tiêu chí dưới đây pass trên production V2.

## Auth
- Đăng nhập bằng email + mật khẩu.
- Không OTP/email code.
- Admin, Leader, Staff đều vào đúng phạm vi quyền.

## Hôm nay
- Hiển thị danh sách việc quá hạn và đến hạn hôm nay.
- Không tải analytics nặng trước danh sách action.
- Mỗi row mở được School Workspace.

## Trường
- Search/filter dưới 100 ms ở client với dataset hiện tại.
- CEO thấy toàn bộ; Leader thấy portfolio mình + Staff; Staff chỉ thấy trường của mình.
- Admin/Leader/Staff thêm School đúng quy tắc quyền.

## School Workspace
- Mở perceived < 500 ms khi warm cache; cold load mục tiêu < 2 s.
- Header có School, owner, relationship state.
- Next Action là khối nổi bật đầu tiên.
- Interaction timeline tải đúng và không trộn Audit.

## Interaction
- Lưu được một interaction thực tế.
- Nếu School đang TARGET, interaction đầu tiên chuyển School sang CONTACTED.
- Không tạo bản sao Next Action.

## Next Action
- Mỗi School chỉ có một OPEN action canonical.
- Tạo action mới tự supersede action OPEN cũ.
- Bắt buộc có action text + due date.
- Today view phản ánh đúng overdue/due today.

## Data integrity
- SCHOOLS không chứa bản sao next_action.
- INTERACTIONS không sửa ngược lịch sử.
- NEXT_ACTIONS giữ lịch sử DONE/SUPERSEDED.
- AUDIT_LOG chỉ chứa system changes.

## UX
- Giao diện 100% tiếng Việt.
- Không modal lồng modal.
- Không monkey patch runtime.
- Không có nút/module chưa hoạt động nhưng trông như đã hoạt động.
