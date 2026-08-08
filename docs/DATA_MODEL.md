# SUNBOT OPS – Data Model Google Sheets

## Organization
- `NHAN_SU`
- `VAI_TRO`
- `NHAN_SU_VAI_TRO`
- `QUYEN_VAI_TRO`

Một user có thể có nhiều role. Thay đổi/kiêm nhiệm vai trò không tạo user mới.

## Market
- `TRUONG`: hồ sơ trường/đơn vị lâu dài.
- `CO_HOI`: cơ hội kinh doanh riêng theo sản phẩm/thời gian.

Không dùng trạng thái của TRUONG thay cho trạng thái CO_HOI.

## Execution
- `CONG_VIEC`
- `CAP_NHAT`
- `VAN_DE`

## Finance/Ops
- `CONG_NO`

## Reporting & Intelligence
- `BAO_CAO_TUAN`
- `AI_FEED`
- `AUDIT_LOG`

Schema từng cột nằm trong `schema/sheets-schema.json` và được mirror trong hằng `SCHEMA` của `apps-script/Code.gs` để hàm `setupSystem()` có thể tự tạo database.
