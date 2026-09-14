# Smoke Tests — School Model 2026

1. Record cũ chỉ có `school_type=Công lập` vẫn hiển thị là Công lập.
2. Record cũ chỉ có `school_type=Tư thục` vẫn hiển thị là Tư thục.
3. PUBLIC + MULTI_CAMPUS + POST_MERGER + campus_count=3 hiển thị `Công lập · Một trường · nhiều điểm/cơ sở · 3 điểm/cơ sở · Sau sáp nhập`.
4. PRIVATE_SYSTEM + MULTI_SCHOOL_GROUP không được hiển thị như một trường nhiều điểm.
5. `campus_count` trống không gây lỗi.
6. Không có field mới thì Opportunity/Task/KPI vẫn hoạt động như trước.
7. Không tự điền payer/approval/teacher source từ tên trường hoặc loại hình sở hữu.
