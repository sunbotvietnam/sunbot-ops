# SUNBOT OPS V2

Hệ thống vận hành nội bộ cho Kiro/Sunbot.

## Mục tiêu
Một lần cập nhật dữ liệu có thể phục vụ đồng thời công việc cá nhân, lịch sử trường, pipeline, công nợ, báo cáo tuần, KPI, CEO dashboard và CEO Intelligence.

## Stack
- Next.js 16
- React 19
- Tailwind CSS 4
- PostgreSQL
- Prisma ORM
- Docker / Docker Compose
- GitHub làm nguồn sự thật duy nhất của code

## Màn hình MVP
- `/` Trang chủ nhân viên
- `/cap-nhat` Cập nhật nhanh
- `/cong-viec` Công việc của tôi
- `/truong` Trường & đơn vị
- `/bao-cao-tuan` Báo cáo tuần
- `/ceo` Dashboard CEO
- `/quan-tri/nhan-su` Nhân sự & vai trò
- `/api/intelligence/daily` API cho Bản tin điều hành

## Chạy local
```bash
cp .env.example .env
docker compose up -d db
npm install
npx prisma migrate dev --name init
npm run dev
```

## Triển khai production
Khuyến nghị dùng `ops.sunbot.vn`, Docker Compose và Nginx trên cloud server hiện có của Sunbot. Xem `docs/DEPLOYMENT.md`.

## Quy tắc cho Codex/ChatGPT
Đọc `docs/AI_CONTEXT.md` trước khi sửa. Không hard-code tên nhân sự; một người có thể có nhiều vai trò. Mọi thay đổi production đi qua branch và Pull Request.

## Trạng thái hiện tại
Frontend và data model đang ở production starter. Dữ liệu giao diện vẫn là mock để chốt UX. Phase tiếp theo: Google OAuth, CRUD PostgreSQL thật, báo cáo tuần tự sinh và Intelligence API thật.
