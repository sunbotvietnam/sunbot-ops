# School Model 2026 — Data Rules

1. Không suy luận `school_ownership` từ tên trường nếu field cũ không đủ rõ.
2. `campus_count` chỉ là số điểm/cơ sở của cùng School Account; không dùng để đếm các trường độc lập trong một hệ thống.
3. `POST_MERGER` mô tả trạng thái tổ chức, không tự động đồng nghĩa `MULTI_CAMPUS`.
4. Một hệ thống trường tư có nhiều trường độc lập phải dùng `MULTI_SCHOOL_GROUP`, mỗi trường giữ một account riêng.
5. `payer_model`, `teacher_source`, `approval_status` phải ghi theo dữ liệu xác minh; thiếu thì dùng UNKNOWN.
6. Trường công ưu tiên hiển thị: cơ chế triển khai, nguồn nhân sự, nguồn chi/thu, trạng thái phê duyệt/chính sách địa phương.
7. Trường tư ưu tiên hiển thị: người quyết định, mô hình học phí, số cơ sở/trường, nguồn giáo viên, khả năng triển khai hệ thống, mức đầu tư.
8. Không thay đổi logic Opportunity/Task/KPI khi triển khai School Model 2026.
