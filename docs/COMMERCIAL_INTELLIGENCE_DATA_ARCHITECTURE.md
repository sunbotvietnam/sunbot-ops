# SUNBOT COMMERCIAL INTELLIGENCE & OPS – Data Architecture v0.2

Status: **Schema locked + additive production database migration completed on 08/08/2026; app code remains behind PR gate until CI/deploy.**

## 1. Mục tiêu

Tạo một nguồn sự thật thống nhất để dữ liệu trường, cơ hội bán hàng, hành động sale, đối thủ, sản phẩm thị trường và tín hiệu thực địa cùng phục vụ:

1. KPI nhân viên;
2. Sunbot Ops;
3. Bản tin điều hành CEO.

Nguyên tắc xuyên suốt:

> Nhân viên cập nhật sự thật → hệ thống tính KPI → AI chuẩn hóa intelligence → CEO Brief hỗ trợ quyết định.

## 2. Bảy thực thể logic

1. **School** → `TRUONG`
2. **Opportunity** → `CO_HOI`
3. **Sales Action** → `CAP_NHAT` + `CONG_VIEC`
4. **Market Signal** → `THI_TRUONG_TIN_HIEU`
5. **Competitor / Market Actor** → `DOI_THU`
6. **Market Offer** → `CHAO_BAN_THI_TRUONG`
7. **KPI** → derived view; không nhập tay

## 3. Canonical source rules

- School master: `TRUONG`.
- Opportunity pipeline: `CO_HOI`.
- Future action/deadline: `CONG_VIEC`.
- Completed interaction/event history: `CAP_NHAT`.
- Receivable/cash truth: `CONG_NO`.
- Raw market intelligence: `THI_TRUONG_TIN_HIEU`.
- Competitor baseline: `DOI_THU`.
- Market offer baseline: `CHAO_BAN_THI_TRUONG`.
- CEO normalized signals: `AI_FEED`.
- Traceability: `AUDIT_LOG`.

`viec_tiep_theo` và `han_viec_tiep_theo` trong `TRUONG`/`CO_HOI` chỉ là cache tương thích V1. Nguồn sự thật cho hành động tương lai là `CONG_VIEC`.

## 4. School ≠ Opportunity

Một trường có thể có nhiều cơ hội độc lập: Lập trình tư duy, STEAM Sáng tạo, lab, event, teacher transfer, hoặc mô hình khác. Vì vậy:

- `TRUONG` lưu account master;
- `CO_HOI` lưu từng revenue object;
- `CAP_NHAT` và `CONG_VIEC` có `opp_id` để action bám đúng opportunity khi cần.

## 5. Opportunity stage chuẩn

- `TARGET`: đã xác định phù hợp nhưng chưa có tiếp xúc thực chất.
- `CONTACTED`: đã có tiếp xúc với người liên quan.
- `DISCOVERY`: đã xác định nhu cầu/bối cảnh/người quyết định.
- `PROPOSAL`: đã gửi cấu hình/đề xuất/báo giá.
- `NEGOTIATION`: đang thương lượng điều kiện hoặc chờ phê duyệt.
- `WON`: đã chốt điều kiện triển khai/hợp đồng.
- `LOST`: mất cơ hội.
- `HOLD`: chưa thể tiến tiếp vì thời điểm/chính sách/ngân sách.

Stage movement phải được ghi dấu trong `CAP_NHAT` hoặc `AUDIT_LOG` để tính KPI.

## 6. Sales Action

### `CAP_NHAT`

Là event log: chuyện đã xảy ra. Một update chỉ được tính là work evidence hợp lệ khi có:

- `ket_qua`;
- `viec_tiep_theo`;
- `han`.

“Đã gọi”, “đang follow” không phải kết quả hoàn chỉnh.

### `CONG_VIEC`

Là commitment: việc phải làm trong tương lai, có owner và deadline. Đây là nguồn canonical cho follow-up hygiene, overdue và next action.

## 7. Market Signal: Signal ≠ Fact ≠ Insight

### Sale nhập

- `raw_signal`: biết được điều gì;
- `source_type`: tận mắt thấy / người trong trường nói / thấy trên mạng / tài liệu ảnh / nghe kể / khác;
- `source_person`;
- `evidence_url`;
- điều cần xác minh.

Sale **không** chấm Confidence và không tự kết luận fact chiến lược.

### Reviewer nhập

- `review_status`;
- `verified_fact`;
- `confidence` A/B/C/D;
- `reviewed_by_user_id`;
- `reviewed_at`.

### AI/CEO

Dùng fact đã xác minh hoặc signal chưa xác minh có gắn nhãn rõ để tạo insight. AI không được tự biến signal thành fact.

## 8. Competitor / actor taxonomy

`actor_type` hỗ trợ các loại:

- `COMPETITOR`
- `BENCHMARK`
- `OPERATOR`
- `PARTNER_CANDIDATE`
- `ECOSYSTEM`

Một actor có thể mang nhiều vai trò theo từng chiều phân tích; UI không được mặc định mọi actor đều là direct competitor.

## 9. Market Offer

`CHAO_BAN_THI_TRUONG` theo dõi thứ đang được bán, không chỉ công ty bán nó:

- tên offer;
- độ tuổi;
- components;
- delivery model;
- price + unit;
- payer;
- equipment model;
- positioning message;
- evidence;
- confidence.

Delivery model chuẩn: `DIRECT_TEACHING`, `TEACHER_TRANSFER`, `LICENSE`, `FRANCHISE`, `PLATFORM`, `EVENT`, `HYBRID`.

## 10. KPI: derived, không self-report

KPI được dẫn xuất từ dữ liệu canonical:

- **School coverage** ← `TRUONG` + `CAP_NHAT`
- **Follow-up hygiene** ← `CONG_VIEC`
- **Pipeline movement** ← `CO_HOI` + `CAP_NHAT` + `AUDIT_LOG`
- **Proposal output** ← `CO_HOI`
- **Win/Hold/Lost** ← `CO_HOI`
- **Expected cash** ← `CO_HOI` + `CONG_NO`
- **Cash realized** ← `CONG_NO`
- **Field intelligence contribution** ← tín hiệu được reviewer chấp nhận trong `THI_TRUONG_TIN_HIEU`
- **Data hygiene** ← completeness của `TRUONG`, `CO_HOI`, `CONG_VIEC`

Không dùng số cuộc gọi như KPI trọng tâm nếu không tạo ra result, next action, pipeline movement hoặc intelligence hữu ích.

## 11. Báo cáo tuần

`BAO_CAO_TUAN` không phải nguồn KPI. Phần định lượng phải tự sinh từ hệ thống. Nhân viên chỉ bổ sung:

- nhận định;
- bối cảnh;
- rủi ro mềm;
- điều cần hỗ trợ;
- ưu tiên tuần tới nếu chưa thể suy ra tự động.

## 12. CEO Brief Data Contract

Bản tin điều hành lấy từ:

- Market change → `THI_TRUONG_TIN_HIEU` + `DOI_THU` + `CHAO_BAN_THI_TRUONG`;
- School movement → `TRUONG` + `CO_HOI`;
- Sales execution → `CAP_NHAT` + `CONG_VIEC`;
- Pipeline → `CO_HOI`;
- Cash → `CONG_NO` + `CO_HOI`;
- CEO decisions → `VAN_DE` + `AI_FEED`;
- External radar → web/email/policy, nhưng phải tách rõ với internal field intelligence.

`AI_FEED` chỉ trả dữ liệu đã chuẩn hóa và giữ `source_type` + `source_id` để truy vết.

## 13. UI contract cho Sunbot Ops

### Nhân viên

- Trang chủ: việc hôm nay, overdue, trường phụ trách, cơ hội của tôi.
- Trường: xem/cập nhật account và lịch sử.
- Cập nhật nhanh: tạo `CAP_NHAT` + next action.
- Thị trường & Cơ hội: tạo raw Market Signal, xem/tạo Opportunity và xem KPI derived của mình.

### Leader

- Pipeline team;
- overdue;
- school coverage;
- data hygiene;
- review opportunity stage.

### Reviewer/CEO

- review Market Signal;
- quản lý Competitor baseline;
- quản lý Market Offer;
- xem KPI derived;
- CEO Cockpit và CEO Intelligence.

## 14. Những thay đổi schema v2

1. Thêm `opp_id` vào `CAP_NHAT`.
2. Thêm `opp_id` vào `CONG_VIEC`.
3. Thêm `expected_cash_date`, `lost_reason` vào `CO_HOI`.
4. Thêm `THI_TRUONG_TIN_HIEU`.
5. Thêm `DOI_THU`.
6. Thêm `CHAO_BAN_THI_TRUONG`.
7. Bổ sung enum, required fields, canonical sources và derived KPI contract vào `schema/sheets-schema.json`.
8. Thêm backend `CommercialIntelligence.gs` và UI `CommercialUi.html` theo cách additive, giữ API V1 nguyên vẹn.

## 15. Production migration 08/08/2026

Đã thực hiện additive migration trên `SUNBOT_OPS_DATABASE`:

- `CO_HOI`: thêm `expected_cash_date`, `lost_reason`;
- `CONG_VIEC`: thêm `opp_id`;
- `CAP_NHAT`: thêm `opp_id`;
- tạo `THI_TRUONG_TIN_HIEU`;
- tạo `DOI_THU`;
- tạo `CHAO_BAN_THI_TRUONG`.

Trước migration đã tạo snapshot backup riêng. Không xóa hoặc đổi tên cột V1, không sửa dữ liệu lịch sử.

## 16. Quy tắc migration và deploy

- Không xóa hoặc đổi tên cột V1 đang được app sử dụng trong cùng migration này.
- Các cột next-action trong `TRUONG`/`CO_HOI` vẫn được giữ để tương thích, nhưng không còn là canonical.
- Backend Commercial Intelligence dùng API riêng `apiSessionCommercial` để giảm rủi ro regression với `apiSession` V1.
- Raw Market Signal không đi vào `AI_FEED`; chỉ signal đã review `DU_CAN_CU` mới được chuẩn hóa vào `AI_FEED`.
- Merge/deploy chỉ thực hiện sau CI pass; production phải được kiểm tra lại sau redeploy.
