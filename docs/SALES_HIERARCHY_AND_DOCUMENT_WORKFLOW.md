# Sunbot Ops — Sales hierarchy & document workflow

## Scope
Sunbot Ops remains a **School Development & Opportunity Management** workspace. It is not a general ERP.

## Role hierarchy
- **Admin/CEO**: manages users and credentials; may create a school and assign it to a Leader or Staff; sees all schools; approves all Proposals. Admin/CEO is not a normal school owner.
- **Leader**: internal Sunbot sales lead (including current Nhung/Dung/Thu); sees own schools plus schools delegated by that Leader to Staff; may create schools; may keep ownership or delegate to Staff; may approve Proposals created by Staff in that delegated portfolio.
- **Staff**: teacher/collaborator/sales support; sees assigned schools only; may add a school for self; may perform the same school-development actions on owned schools; cannot reassign upward to Leader/Admin or sideways to another user.

Every reassignment is written to `AUDIT_LOG`. `TIEP_CAN_TRUONG.assigned_by_user_id` preserves the delegating Leader/Admin so a Leader does not lose management visibility after handing execution to Staff.

## Credentials
`AUTH_CREDENTIALS` is the operational backend for login identity and PIN administration.

Fields used by the app:
- `user_id`
- `email` (optional for Staff)
- `login_id`
- `visible_pin`
- `verifier_hmac_sha256`
- `status`
- `updated_at`

Admin can edit users and reset PIN in the frontend. If an Admin changes `visible_pin` directly in the backend Sheet, login synchronizes the cryptographic verifier before authentication. Plaintext PINs are never committed to the public GitHub repository.

## School creation & assignment
`OutreachCreate` accepts an optional `owner_user_id` and enforces hierarchy rules server-side. The frontend owner selector is convenience only; the backend remains authoritative.

## Meeting → follow-up document → Proposal
1. Discovery meeting follows Context → E-profile → Catalogue → Guided Discovery → Need Statement → Next Action.
2. After the meeting, Sunbot can create **Phiếu ghi nhận sau buổi trao đổi**. This is externally shareable immediately and explicitly states that it is not yet a commercial proposal.
3. The PDF can be opened/downloaded for Zalo and its link can be copied or inserted into a prepared thank-you Gmail draft.
4. Proposal is a separate action. It is generated as a professional Google Doc + PDF with school, reference, date and version.
5. Proposal starts as `PENDING_APPROVAL` and carries a draft warning.
6. Admin/CEO can approve all Proposals. Leader can approve only Staff Proposals in their delegated portfolio.
7. Approval regenerates a final PDF snapshot and replaces the draft warning with an internal approval record.

## Data tables
- `DOCUMENT_OUTPUT`: document registry and approval state.
- `AUDIT_LOG`: create/reassign/reset/approve/reject actions.
- `CAP_NHAT`: real school interaction evidence.
- `CONG_VIEC`: canonical next action and deadline.

## Design principles carried from PEFSO
Reuse the strongest PEFSO patterns — role-aware UI, backend-visible credentials, approval queue, professional documents, auditability and compact enterprise design — without importing PEFSO's buyer/deal/quotation workflow literally into Sunbot.
