# Sunbot School Model 2026 — Canonical v1

## Mục tiêu
Chuẩn hóa cách Sunbot Ops mô hình hóa trường công, trường tư, trường sau sáp nhập và mô hình nhiều điểm/cơ sở. Tài liệu này là nguồn chuẩn cho schema, giao diện School OS, logic đề xuất và wording.

## 1. Phân loại trường

### school_ownership
- PUBLIC — Công lập
- PRIVATE — Tư thục
- PRIVATE_SYSTEM — Hệ thống trường tư
- OTHER — Khác

### organization_structure
- SINGLE_SITE — Một trường, một điểm
- MULTI_CAMPUS — Một trường, nhiều điểm/cơ sở
- MULTI_SCHOOL_GROUP — Một hệ thống, nhiều trường độc lập
- CLUSTER — Cụm triển khai/đề án địa phương

### merger_status
- INDEPENDENT — Độc lập
- POST_MERGER — Sau sáp nhập
- PENDING_VERIFY — Chờ xác minh

## 2. Nguyên tắc account
- Một trường nhiều điểm nhưng cùng pháp nhân/ban giám hiệu/hợp đồng/tài chính = một School Account, nhiều campus.
- Nhiều trường độc lập, kể cả cùng chủ đầu tư/hệ thống = nhiều School Account dưới một group/system.
- Multi-campus không đồng nghĩa multi-school.

## 3. Mô hình triển khai Sunbot
### DIRECT
Sunbot trực tiếp tổ chức giảng dạy và vận hành chính.

### CO_DELIVERY
Sunbot và nhà trường phối hợp phân vai nhân sự và vận hành.

### SCHOOL_LED
Nhà trường chủ động nhân sự; Sunbot cung cấp chương trình, học cụ, công nghệ, đào tạo, đồng hành chuyên môn và đảm bảo chất lượng.

### SYSTEM_MULTI_SITE
Triển khai theo nhiều điểm/cơ sở với điều phối tập trung; vẫn phải phân biệt rõ một trường nhiều điểm với nhiều trường độc lập.

## 4. Khác biệt trường công và trường tư
### Trường công
Theo dõi tối thiểu:
- cơ chế triển khai;
- nguồn nhân sự đứng lớp;
- nguồn chi/thu;
- trạng thái phê duyệt/chính sách địa phương;
- nhu cầu đầu tư ban đầu;
- cấu trúc điểm trường sau sáp nhập nếu có.

Câu hỏi vận hành cốt lõi: ai tổ chức nhân sự, nguồn tiền theo cơ chế nào, ai phê duyệt và Sunbot chịu trách nhiệm phần nào.

### Trường tư
Theo dõi tối thiểu:
- chủ trường/người quyết định;
- học phí hiện hành;
- Sunbot nằm trong học phí chung hay dịch vụ lựa chọn;
- nguồn giáo viên;
- số cơ sở;
- khả năng triển khai toàn hệ thống;
- mức đầu tư phòng/học cụ;
- mục tiêu khác biệt hóa giáo dục/thương hiệu.

## 5. Wording chuẩn
- Sunbot là hệ thống giáo dục công nghệ dành cho trẻ mầm non, không chỉ là một bộ robot.
- Robot là học cụ; trọng tâm là trẻ, giáo viên và quá trình học.
- Sunbot cung cấp chương trình, học cụ, công nghệ, đào tạo và hệ thống đảm bảo chất lượng để nhà trường có thể lựa chọn mô hình triển khai phù hợp nguồn lực thực tế.
- Trẻ không học công nghệ để trở thành lập trình viên sớm; trẻ sử dụng công nghệ để quan sát, thử nghiệm, sửa sai, giải quyết vấn đề và học cách tư duy.

## 6. Trường dữ liệu chuẩn mở rộng
- school_ownership
- organization_structure
- merger_status
- campus_count
- delivery_model_current
- delivery_model_proposed
- teacher_source
- payer_model
- approval_status
- policy_note

## 7. Entity điểm trường/campus
Đề xuất entity DIEM_TRUONG gồm:
- campus_id
- account_id
- campus_name
- address
- children
- classes
- room_status
- equipment_status
- teacher_status
- deployment_status
- note

## 8. Nguyên tắc tương thích
- Mở rộng theo kiểu additive, không xóa field cũ.
- Field cũ tiếp tục đọc được để không phá dữ liệu lịch sử.
- UI ưu tiên field canonical mới; nếu trống thì fallback về dữ liệu cũ.
