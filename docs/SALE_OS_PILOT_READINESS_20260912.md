# SUNBOT OPS — Sales Pilot Readiness · 12/09/2026

## Mục tiêu
Chuẩn bị SUNBOT OPS trở thành hệ làm việc chính cho Sale, thay dần Sổ theo dõi trường chuyển tiếp. Không tạo CRM thứ ba.

## Luồng đích
Sales Hub → SUNBOT OPS → Ứng dụng Báo giá.

Sale chỉ cần hiểu 4 phản xạ:
1. Hiểu trường.
2. Ghi lại kết quả.
3. Ghi việc tiếp theo + ngày cần làm.
4. Khi cần giá chính thức, gửi yêu cầu báo giá.

## Canonical data
- Trường/đơn vị: `TRUONG`.
- Cơ hội: `CO_HOI`.
- Việc tiếp theo/deadline: `CONG_VIEC`.
- Kết quả trao đổi: `CAP_NHAT`.
- Tín hiệu thị trường: `THI_TRUONG_TIN_HIEU`.
- Database production: `SUNBOT_OPS_DATABASE`.

Không dùng file `7.9_SUNBOT_SCHOOL_OS_PRODUCTION` làm database production cho luồng Sale. Đây không phải canonical database của repo `sunbot-ops`.

## Readiness audit
### Đã có
- Danh sách trường thực tế trong `TRUONG`.
- Nhân sự/role/permission.
- Công việc và cập nhật có dữ liệu thực.
- Backend tạo cơ hội, cập nhật trạng thái, sinh công việc tiếp theo và audit log.
- Module `Thị trường & Cơ hội`.
- KPI derived từ dữ liệu canonical.

### Đã sửa trong branch pilot
- Mặc định mở module ở `Cơ hội bán hàng`, thay vì bắt Sale đi qua tab intelligence trước.
- Ngôn ngữ UI đơn giản hơn, ưu tiên tiếng Việt.
- Danh sách cơ hội hiển thị việc tiếp theo và hạn.
- Thêm thao tác cập nhật cơ hội: tình hình hiện tại, kết quả vừa có, việc tiếp theo, hạn, lý do dừng và ngày tiền dự kiến.
- Nhắc rõ một cơ hội đang làm phải có `tình hình hiện tại + việc tiếp theo + ngày cần làm`.

### Chưa đạt để cutover
1. `CO_HOI` production hiện chưa có dữ liệu sống; cần pilot tạo/điều chỉnh một số cơ hội thật trước khi migrate hàng loạt.
2. Sổ theo dõi chuyển tiếp có entity `CONTACTS`, còn schema production hiện chỉ có `nguoi_quyet_dinh` + `dien_thoai` trên `TRUONG`. Cần quyết định mức contact tối thiểu cho V1 pilot trước khi migrate toàn bộ lịch sử contact.
3. Một số text dữ liệu cũ còn dùng từ `gia hạn`; theo cơ chế 2026–2027, năm 2/tái ký phải được quản lý như một cơ hội/chu kỳ mới, không phải logic gia hạn calculator.
4. Cần test E2E với 1–2 Sale: tạo cơ hội → cập nhật kết quả → sinh việc tiếp theo → nhìn dashboard/KPI → gửi yêu cầu báo giá.

## Quy tắc pilot
- Không khóa Sổ theo dõi trường cũ trong giai đoạn pilot.
- Pilot chỉ dùng 1–2 Sale và tập nhỏ cơ hội thật.
- Không migrate toàn bộ lịch sử tương tác trước khi mapping được đối chiếu.
- Không đẩy Sale vào Google Sheet; Sale chỉ dùng Web App.
- Không yêu cầu Sale học tên bảng, schema hoặc thuật ngữ kỹ thuật.

## Gate để chuyển hẳn
Chỉ cutover khi đủ cả 6 điều kiện:
1. Login/permission ổn định.
2. Tạo và cập nhật cơ hội chạy E2E.
3. Việc tiếp theo/deadline sinh đúng và hiển thị đúng.
4. Dữ liệu pilot đối chiếu đúng với Sổ theo dõi chuyển tiếp.
5. Contact tối thiểu không bị mất.
6. Hai Sale pilot hoàn thành tác vụ mà không cần mở Sheet hoặc hỏi cách dùng hệ thống ở các bước cơ bản.

Sau khi đạt gate: migrate cơ hội đang sống → khóa nhập Sổ theo dõi cũ → đổi link trong Sales Hub → archive Sổ theo dõi cũ.