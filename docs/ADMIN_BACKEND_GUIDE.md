# Admin backend guide

Production database: `SUNBOT_OPS_DATABASE`.

Admin-editable operational tabs relevant to School Development:
- `NHAN_SU`: person master.
- `NHAN_SU_VAI_TRO`: user roles.
- `AUTH_CREDENTIALS`: login ID/PIN/status.
- `TIEP_CAN_TRUONG`: school outreach execution and current owner.
- `CONG_VIEC`: canonical next actions.
- `DOCUMENT_OUTPUT`: generated files and approval state.
- `AUDIT_LOG`: traceability.

Day-to-day Admin work should normally happen through the frontend `Quản trị` tab. Direct Sheet edits are reserved for backend administration/recovery and should preserve stable IDs.
