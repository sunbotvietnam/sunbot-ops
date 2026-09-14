# School Model 2026 — Legacy Field Mapping

| Canonical | Fallback cũ | Ghi chú |
|---|---|---|
| school_ownership | school_type / loai_hinh / khoi_truong | Suy luận Công/Tư nếu field mới trống |
| organization_structure | — | Bắt buộc nhập mới khi cần phân biệt một điểm/nhiều điểm |
| merger_status | — | Mặc định chờ xác minh nếu không rõ |
| campus_count | — | Chỉ có ý nghĩa khi structure = MULTI_CAMPUS |
| delivery_model_current | mo_hinh_hien_tai | Chuẩn hóa về DIRECT/CO_DELIVERY/SCHOOL_LED/SYSTEM_MULTI_SITE |
| delivery_model_proposed | mo_hinh_tiem_nang | Chuẩn hóa về cùng enum |
| teacher_source | — | Không suy luận tự động nếu thiếu dữ liệu |
| payer_model | — | Không suy luận tự động nếu thiếu dữ liệu |
| approval_status | — | Không suy luận tự động nếu thiếu dữ liệu |
| policy_note | — | Ghi chú chính sách/pháp lý địa phương |

Nguyên tắc: không backfill bằng phỏng đoán; chỉ map khi dữ liệu cũ có nghĩa rõ ràng.