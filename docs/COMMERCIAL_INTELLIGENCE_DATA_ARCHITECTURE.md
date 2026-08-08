# SUNBOT COMMERCIAL INTELLIGENCE & OPS – Data Architecture v0.2

Status: **Schema locked + additive production database migration completed on 08/08/2026; app code remains behind PR gate until CI/deploy.**

## 1. Mục tiêu
Tạo một nguồn sự thật thống nhất để dữ liệu trường, cơ hội bán hàng, hành động sale, đối thủ, sản phẩm thị trường và tín hiệu thực địa cùng phục vụ KPI nhân viên, Sunbot Ops và Bản tin điều hành CEO.

> Nhân viên cập nhật sự thật → hệ thống tính KPI → AI chuẩn hóa intelligence → CEO Brief hỗ trợ quyết định.

## 2. Bảy thực thể logic
1. School → `TRUONG`
2. Opportunity → `CO_HOI`
3. Sales Action → `CAP_NHAT` + `CONG_VIEC`
4. Market Signal → `THI_TRUONG_TIN_HIEU`
5. Competitor / Market Actor → `DOI_THU`
6. Market Offer → `CHAO_BAN_THI_TRUONG`
7. KPI → derived view; không nhập tay

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
Một trường có thể có nhiều cơ hội độc lập: Lập trình tư duy, STEAM Sáng tạo, lab, event, teacher transfer hoặc mô hình khác. `TRUONG` lưu account master; `CO_HOI` lưu từng revenue object; `CAP_NHAT` và `CONG_VIEC` có `opp_id` để action bám đúng opportunity khi cần.

## 5. Opportunity stage chuẩn
`TARGET` → `CONTACTED` → `DISCOVERY` → `PROPOSAL` → `NEGOTIATION` → `WON`; `LOST` và `HOLD` là trạng thái kết thúc/tạm dừng. Stage movement phải truy vết trong `CAP_NHAT` hoặc `AUDIT_LOG`.

## 6. Sales Action
`CAP_NHAT` là event log. Một update chỉ được tính là work evidence hợp lệ khi có `ket_qua + viec_tiep_theo + han`. “Đã gọi”, “đang follow” không phải kết quả hoàn chỉnh.

`CONG_VIEC` là commitment trong tương lai, có owner và deadline; đây là nguồn canonical cho follow-up hygiene, overdue và next action.

## 7. Market Signal: Signal ≠ Fact ≠ Insight
Sale nhập raw signal, source type/person và evidence. Sale không chấm Confidence và không tự kết luận fact chiến lược.

Reviewer nhập `review_status`, `verified_fact`, `confidence`, `reviewed_by_user_id`, `reviewed_at`.

AI/CEO chỉ dùng fact đã xác minh hoặc signal chưa xác minh có gắn nhãn rõ. Raw signal không được tự biến thành fact.

## 8. Competitor / actor taxonomy
`COMPETITOR`, `BENCHMARK`, `OPERATOR`, `PARTNER_CANDIDATE`, `ECOSYSTEM`. Một actor có thể mang nhiều vai trò theo từng chiều phân tích.

## 9. Market Offer
`CHAO_BAN_THI_TRUONG` theo dõi thứ đang được bán: tên offer, độ tuổi, components, delivery model, price + unit, payer, equipment model, positioning, evidence và confidence.

Delivery model chuẩn: `DIRECT_TEACHING`, `TEACHER_TRANSFER`, `LICENSE`, `FRANCHISE`, `PLATFORM`, `EVENT`, `HYBRID`.

## 10. KPI: derived, không self-report
- School coverage ← `TRUONG` + `CAP_NHAT`
- Follow-up hygiene ← `CONG_VIEC`
- Pipeline movement ← `CO_HOI` + `CAP_NHAT` + `AUDIT_LOG`
- Proposal output ← `CO_HOI`
- Win/Hold/Lost ← `CO_HOI`
- Expected cash ← `CO_HOI` + `CONG_NO`
- Cash realized ← `CONG_NO`
- Field intelligence contribution ← tín hiệu reviewer chấp nhận trong `THI_TRUONG_TIN_HIEU`
- Data hygiene ← `TRUONG` + `CO_HOI` + `CONG_VIEC`

Không dùng số cuộc gọi như KPI trọng tâm nếu không tạo result, next action, pipeline movement hoặc intelligence hữu ích.

## 11. Báo cáo tuần
`BAO_CAO_TUAN` không phải nguồn KPI. Phần định lượng tự sinh từ hệ thống; nhân viên chỉ bổ sung nhận định, bối cảnh, rủi ro mềm, điều cần hỗ trợ và ưu tiên chưa thể suy ra tự động.

## 12. CEO Brief Data Contract
- Market change → `THI_TRUONG_TIN_HIEU` + `DOI_THU` + `CHAO_BAN_THI_TRUONG`
- School movement → `TRUONG` + `CO_HOI`
- Sales execution → `CAP_NHAT` + `CONG_VIEC`
- Pipeline → `CO_HOI`
- Cash → `CONG_NO` + `CO_HOI`
- CEO decisions → `VAN_DE` + `AI_FEED`
- External radar → web/email/policy, tách rõ với internal field intelligence

`AI_FEED` giữ `source_type` + `source_id` để truy vết.

## 13. UI contract
Nhân viên có một module gọn `Thị trường & Cơ hội` gồm Ghi nhận thị trường, Cơ hội và KPI. Google Sheets vẫn là data/admin layer; nhân viên không làm việc trực tiếp trên raw Sheet.

## 14. Thay đổi schema v2
1. Thêm `opp_id` vào `CAP_NHAT`.
2. Thêm `opp_id` vào `CONG_VIEC`.
3. Thêm `expected_cash_date`, `lost_reason` vào `CO_HOI`.
4. Thêm `THI_TRUONG_TIN_HIEU`.
5. Thêm `DOI_THU`.
6. Thêm `CHAO_BAN_THI_TRUONG`.
7. Bổ sung enum, required fields, canonical sources và KPI contract.
8. Thêm backend `CommercialIntelligence.gs` và UI `CommercialUi.html` additive, giữ API V1 nguyên vẹn.

## 15. Production migration 08/08/2026
Đã thực hiện additive migration trên `SUNBOT_OPS_DATABASE`: bổ sung các field nói trên và tạo 3 sheet mới. Trước migration đã tạo snapshot backup riêng. Không xóa/đổi tên cột V1, không sửa dữ liệu lịch sử.

## 16. Runtime guard và deploy
- `apiSessionCommercial` chạy `ensureCommercialRuntimeSchema_()` trước mỗi request, fail-fast nếu database chưa có đúng migration v2.
- `productionHealthCheck()` kiểm tra riêng `commercialSchemaComplete`.
- Raw Market Signal không đi vào `AI_FEED`; chỉ signal review `DU_CAN_CU` mới được chuẩn hóa.
- Merge/deploy chỉ sau CI pass; production phải health-check lại sau redeploy.
