# AI_CONTEXT – dành cho Codex/ChatGPT

1. Không hard-code tên nhân sự.
2. Quyền đi qua UserRole → RolePermission.
3. Một người có thể có nhiều role.
4. UI nhân viên dùng tiếng Việt và mobile-first.
5. Một cập nhật phải có: kết quả, việc tiếp theo, deadline.
6. Không coi “đã gọi”, “đang follow” là kết quả hoàn chỉnh.
7. Account và Opportunity là hai entity khác nhau.
8. Đổi schema phải bằng Prisma migration.
9. Cập nhật nghiệp vụ quan trọng phải cập nhật docs.
10. Intelligence API chỉ trả tín hiệu đã chuẩn hóa, không trả raw database.

Workflow AI:
- tạo branch;
- nêu file sẽ sửa;
- sửa + build/typecheck;
- migration nếu cần;
- mở PR;
- không sửa trực tiếp production.
