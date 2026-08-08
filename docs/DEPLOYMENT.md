# Triển khai SUNBOT OPS trên cloud Sunbot

Khuyến nghị:
- GitHub repo: `sunbotvietnam/sunbot-ops`
- Production: Docker Compose trên server cloud hiện có
- Domain: `ops.sunbot.vn`
- Reverse proxy: Nginx
- HTTPS: Certbot hoặc reverse proxy/SSL hiện có
- PostgreSQL: container hoặc managed database
- Backup database hằng ngày
- Secret chỉ lưu trên server/GitHub Secrets, không commit vào repo

## Deploy thủ công
1. Clone repo vào `/opt/sunbot-ops`.
2. Copy `.env.example` thành `.env` và điền secret thật.
3. Chạy migration database.
4. `docker compose up -d --build`.
5. Cấu hình Nginx trỏ `ops.sunbot.vn` tới `127.0.0.1:3010`.
6. Cấp SSL.
7. Kiểm tra `/api/health`.

## Sau này
Có thể bật GitHub Actions deploy qua SSH sau khi cấu hình GitHub Secrets cho server.
