# Deploy SUNBOT OPS lên Google Apps Script

Production owner: `hrmanager.kiro@gmail.com`.

## Nguyên tắc
GitHub là nguồn sự thật duy nhất của code. Không chỉnh code production trực tiếp trong Apps Script editor sau khi CI/CD đã hoạt động.

## 1. Bật Apps Script API
Đăng nhập tài khoản production và bật **Google Apps Script API** trong Apps Script user settings.

## 2. Tạo credential clasp trên máy đã đăng nhập production

```bash
npx @google/clasp@latest login
cat ~/.clasprc.json
```

Nội dung `~/.clasprc.json` chứa refresh token, phải coi là secret.

## 3. Thêm GitHub Actions secrets
Trong repository `sunbotvietnam/sunbot-ops` → Settings → Secrets and variables → Actions, tạo:

### `CLASPRC_JSON`
Toàn bộ nội dung file `~/.clasprc.json` sinh bởi `clasp login` dưới `hrmanager.kiro@gmail.com`.

### `CLASP_JSON`
JSON cấu hình Apps Script project production với dạng:

```json
{
  "scriptId": "<SCRIPT_ID_PRODUCTION>",
  "rootDir": "apps-script"
}
```

Không commit hai credential trên vào repository.

## 4. Deploy source
Workflow `.github/workflows/deploy-apps-script.yml` sẽ:
1. checkout source;
2. dựng `.clasprc.json` và `.clasp.json` từ GitHub Secrets;
3. chạy `clasp push --force`;
4. tạo một immutable Apps Script version gắn với Git commit SHA.

Có thể chạy thủ công bằng **Actions → Deploy Apps Script production → Run workflow**.
Sau khi secrets đã hoạt động, mọi thay đổi `apps-script/**` merge vào `main` cũng tự push source production.

> Lưu ý: `clasp push --force` thay thế toàn bộ nội dung Apps Script project. Vì vậy không sửa tay trong Apps Script editor nếu thay đổi đó chưa có trên GitHub.

## 5. Kết nối project với database Drive hiện có
Sau lần push đầu tiên, trong Apps Script editor chạy đúng một lần:

```javascript
connectExistingProduction()
```

Hàm này **không tạo database mới**; nó trỏ Script Properties vào database/folder production đã bootstrap và cài trigger báo cáo tuần thứ Bảy.

Sau đó chạy:

```javascript
productionHealthCheck()
```

Các check về database, folder, schema và trigger phải là `true`. Hai check OAuth/Intelligence chỉ chuyển thành true sau bước cấu hình secrets ứng dụng.

## 6. Cấu hình Google Login và Intelligence token
Tạo OAuth Web Client ID cho Google Identity Services, rồi trong Apps Script chạy:

```javascript
configureSecrets('GOOGLE_CLIENT_ID.apps.googleusercontent.com', 'INTELLIGENCE_TOKEN_DAI_NGAU_NHIEN')
```

Không ghi hai giá trị này vào GitHub.

## 7. Deploy Web App
Trong Apps Script: Deploy → New deployment → Web app.

Khuyến nghị:
- Execute as: tài khoản triển khai production.
- Access: phạm vi phù hợp với người dùng thực tế.

Backend vẫn xác minh Google ID token và kiểm tra email trong `NHAN_SU` trước mỗi API call.

## 8. Kiểm thử tối thiểu
- CEO/Admin đăng nhập được.
- Một staff test chỉ xem dữ liệu thuộc phạm vi quyền.
- Cập nhật nhanh ghi vào `CAP_NHAT` và `AI_FEED`.
- Việc cần CEO sinh `VAN_DE`.
- Báo cáo tuần sinh draft.
- Intelligence endpoint chỉ trả dữ liệu chuẩn hóa.
