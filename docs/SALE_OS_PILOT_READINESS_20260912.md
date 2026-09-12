# SUNBOT SCHOOL OS V2 — Sales Pilot Readiness · 12/09/2026

## Mục tiêu
Chuẩn bị **Sunbot School OS V2** trở thành nơi làm việc chính của Sale, thay dần Sổ theo dõi trường chuyển tiếp. Không tạo CRM thứ ba.

## Luồng đích
**Sales Hub → Sunbot School OS → Ứng dụng Báo giá.**

Sale chỉ cần 4 phản xạ:
1. Hiểu trường.
2. Ghi kết quả trao đổi.
3. Ghi việc tiếp theo + ngày cần làm.
4. Khi cần giá chính thức, gửi yêu cầu trên Ứng dụng Báo giá.

## Nguồn dữ liệu V2
Database của School OS V2: **`SUNBOT_SCHOOL_OS_DB_V2`**.

Các bảng lõi:
- Trường: `SCHOOLS`.
- Lịch sử trao đổi: `INTERACTIONS`.
- Việc tiếp theo: `NEXT_ACTIONS`.
- Khám phá nhu cầu: `DISCOVERIES`.
- Cơ hội: `OPPORTUNITIES`.
- Đề xuất: `PROPOSALS`.
- Nhật ký hệ thống: `AUDIT_LOG`.

`SUNBOT_OPS_DATABASE` vẫn là database V1 đang phục vụ các luồng vận hành hiện hữu; không dùng hai database như hai CRM song song cho Sale sau khi V2 cutover.

Không dùng file `7.9_SUNBOT_SCHOOL_OS_PRODUCTION` làm database production của School OS V2.

## Readiness audit
### Đã có trong V2
- Danh sách trường thật đã được migrate vào `SCHOOLS`.
- Trường có một đầu mối chính: tên, vai trò, email, điện thoại.
- Phân quyền Admin / Leader / Staff.
- `INTERACTIONS` và `NEXT_ACTIONS` tách lịch sử khỏi trạng thái hiện hành.
- Mỗi trường chỉ có một Next Action `OPEN`; action mới supersede action cũ.
- Màn `Hôm nay` và `Trường` đã có luồng đọc dữ liệu V2.
- Backend Phase 1 hỗ trợ: đăng nhập, xem trường, thêm trường, ghi trao đổi, đặt/hoàn thành việc tiếp theo.

### Đã chỉnh trong branch pilot
- UI ưu tiên tiếng Việt và ngôn ngữ gần với Sale mầm non.
- Màn `Trường` giải thích bằng 4 câu hỏi đơn giản: trường nào / ai phụ trách / đang ở đâu / làm gì tiếp.
- Hồ sơ trường hiển thị đầu mối nhà trường.
- Form thêm trường cho phép ghi ngay đầu mối, vai trò, điện thoại, email và địa chỉ.
- `Ghi nhận tương tác` đổi thành `Ghi kết quả trao đổi`.
- `Next Action` đổi thành `Việc tiếp theo` ở giao diện Sale.
- Ẩn nút/module Discovery và Opportunity chưa hoạt động để đúng nguyên tắc: không có nút trông như dùng được nhưng thực tế chưa chạy.
- Không sửa V1 Commercial UI; pilot tập trung đúng vào School OS V2.

### Gate còn phải xử lý trước pilot thật
1. **Phase 1 E2E chưa được xác nhận trên runtime production V2:** đăng nhập → mở trường → ghi kết quả → đặt việc tiếp theo → kiểm tra Hôm nay.
2. `INTERACTIONS` và `NEXT_ACTIONS` hiện chưa có dữ liệu pilot đủ để kiểm chứng hành vi thực địa.
3. **Bảo mật đăng nhập V2 cần hardening:** database hiện còn cơ chế mật khẩu hiển thị để bootstrap. Trước pilot thật phải chuyển sang verifier/hash và không để mật khẩu đọc được trong Sheet.
4. Chưa bật Discovery/Opportunity. Việc này chỉ làm sau khi Phase 1 pass, đúng `PHASE1_ACCEPTANCE.md`.
5. Chưa migrate lịch sử từ Sổ theo dõi chuyển tiếp; giai đoạn pilot chỉ đối chiếu một tập nhỏ, không chuyển hàng loạt.

## Quy tắc pilot
- Không khóa Sổ theo dõi trường cũ trong giai đoạn pilot.
- Chỉ pilot 1–2 Sale và một tập nhỏ trường thật.
- Sale chỉ dùng Web App; không mở database Sheet để làm việc.
- Không yêu cầu Sale học tên bảng/schema/thuật ngữ kỹ thuật.
- Với Phase 1, mục tiêu là tạo thói quen: **mỗi trao đổi có kết quả; mỗi trường active có một việc tiếp theo có hạn**.

## Trình tự thực hiện
### Giai đoạn A — Hoàn thiện Phase 1
- Làm sạch UI tiếng Việt.
- Ẩn mọi module chưa chạy.
- Kiểm tra contact chính, quyền xem trường, Interaction và Next Action.
- Hardening mật khẩu V2.
- Chạy test E2E.

### Giai đoạn B — Pilot 1–2 Sale
- Chọn 5–10 trường/cơ hội đang sống cho mỗi người.
- Dùng V2 song song Sổ theo dõi cũ trong thời gian ngắn.
- Đối chiếu dữ liệu và quan sát điểm người dùng bị vướng.

### Giai đoạn C — Phase 2
- Bật Discovery Wizard bằng 8 câu hỏi gần với Sales Handbook.
- Chỉ sinh Opportunity khi Need Statement đủ rõ.
- Nối Opportunity → phương án/báo giá.

### Giai đoạn D — Cutover
- Migrate trường/cơ hội đang sống và dữ liệu cần thiết.
- Khóa nhập Sổ theo dõi cũ.
- Đổi link `Sổ theo dõi trường` trong Sales Hub sang Sunbot OS.
- Archive CRM/Sổ theo dõi cũ.

## Gate để chuyển hẳn
Chỉ cutover khi đủ:
1. Login/permission ổn định và không lưu mật khẩu đọc được.
2. Interaction + Next Action chạy E2E.
3. Màn Hôm nay phản ánh đúng việc đến hạn/quá hạn.
4. Dữ liệu pilot đối chiếu đúng với Sổ theo dõi chuyển tiếp.
5. Đầu mối trường không bị mất.
6. 1–2 Sale pilot hoàn thành tác vụ cơ bản mà không cần mở Sheet hoặc hỏi cách dùng hệ thống.
7. Discovery/Opportunity được bật và test sau Phase 1, trước khi bỏ hoàn toàn hệ cũ.
