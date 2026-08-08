# SUNBOT OPS – Data Model

## Nguyên tắc chính
- Một **Trường/Đơn vị** là một `Account` tồn tại lâu dài.
- Một Account có thể có nhiều `Opportunity` theo thời gian: Dạy liên kết, Chuyển giao, Lab, Đào tạo, Sự kiện...
- Một `User` có thể có nhiều `Role`.
- Quyền đi qua `UserRole → Role → RolePermission → Permission`.
- Dữ liệu cập nhật vận hành nằm ở `Task`, `Update`, `Receivable`, `WeeklyReport`.
- Mọi thay đổi nhạy cảm cần audit trail.

## Mục tiêu thiết kế
Không phải thay schema khi một giáo viên sau này kiêm sale, một sale trở thành trưởng vùng, hay một nhân sự có thêm vai trò trainer.
