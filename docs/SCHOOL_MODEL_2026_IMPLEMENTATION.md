# School Model 2026 — Implementation Notes

## Đã thêm
- `docs/SCHOOL_MODEL_2026_CANONICAL.md`: chuẩn nội dung.
- `schema/school-model-2026.json`: enum và quy tắc account/campus.
- `frontend/school-model-2026-v33.js`: lớp hiển thị/fallback cho phân loại 2026.
- `frontend/school-model-2026-v33.css`: style cho nhãn phân loại.

## Nguyên tắc triển khai
- Không xóa field cũ.
- `school_type`, `loai_hinh`, `khoi_truong` vẫn được đọc làm fallback cho `school_ownership`.
- Không thay logic Opportunity, Task, Market Signal, KPI.
- Multi-campus và multi-school là hai khái niệm khác nhau.

## Việc cần nối vào production
1. Include JS/CSS mới trong bundle Apps Script production.
2. Mở rộng Profile API để lưu các field canonical mới.
3. Bổ sung form chỉnh sửa trường với các field canonical.
4. Tạo entity `DIEM_TRUONG`/campus theo kiểu additive khi backend schema được migration.
5. Kiểm tra trường cũ không có field mới vẫn mở bình thường.
