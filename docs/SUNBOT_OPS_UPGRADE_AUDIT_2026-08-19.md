# SUNBOT OPS Upgrade Audit · 19/08/2026

Baseline: `Sunbot Ops Upgrade Blueprint` dated 19/08/2026.

## Executive conclusion

Sunbot Ops should be upgraded additively, not rebuilt. The current system already has a strong operational spine: School/account data, outreach execution, canonical Tasks/Next Action, CAP_NHAT event evidence, AUDIT_LOG traceability, opportunity separation, role/permission tables, cached fast-load, school timeline, E-profile tracking and discovery handoff.

The main gaps are not a lack of data. They are information architecture and operating discipline: the app still feels primarily like an outreach list, role-specific guidance is thin, management exceptions are not yet the first-class homepage concept, robot support is not yet a dedicated case workflow, and external document outputs are not yet a governed document system.

## Retain as canonical

### School
- `TRUONG` remains the School master.
- `TIEP_CAN_TRUONG` remains the outreach execution view/source for the active school-development campaign.
- Do not merge School and Opportunity.

### Next Action
- `CONG_VIEC` remains canonical for future action + deadline.
- Existing next-action fields in account/outreach records are display/cache fields only where needed.
- Upgrade UI so every active School shows owner + next action + date without opening detail.

### Activity vs Audit
- Retain `CAP_NHAT` as the Activity Log / evidence of real work.
- Retain `AUDIT_LOG` exclusively for data/system changes, reassignments, approval, delete/restore and structural traceability.
- Do **not** add a second `ACTIVITY_LOG` sheet: that would duplicate `CAP_NHAT` and create a silo.

### Opportunity
- `CO_HOI` remains separate from School and should only be created after a qualified need / meaningful opportunity exists.

### Role and permissions
- Retain `NHAN_SU`, `VAI_TRO`, `NHAN_SU_VAI_TRO`, `QUYEN_VAI_TRO`.
- Extend dashboards contextually by role; do not expose universal navigation to everyone.

### Speed
- Retain static GitHub Pages shell, split JS/CSS, `fast/load` cache and lazy Tasks loading.
- Extend with visible freshness/stale state; do not add heavy startup reads.

## Redesign

### 1. Role-aware command center
Current CEO school summary is useful but still count-oriented. Redesign to exception-first:
- overdue school follow-ups;
- schools missing next action/date;
- schools waiting too long;
- meaningful movement;
- E-profile engagement;
- owner distribution.

For staff, the first screen should answer: Which schools require my action now? What is overdue? What is waiting? What must have a next action before I finish?

### 2. School + Next Action as operating core
Keep `Trường` and `Công việc` as the primary navigation. Do not rebuild all Sheets into modules. School cards/tables must make next action/date visually primary, flag missing commitments, and show owner only when role requires it.

### 3. Quick Guide by role
Add short contextual guidance inside the app rather than a separate training module. Examples:
- Market/Sales: every meaningful contact must end in result + next action + date; sending material alone is not success.
- CEO/Admin: manage exceptions and ownership, not raw activity counts.
- Technical Support (Stage 2): every open case needs current holder + next action/date + evidence.

### 4. Technical Case workflow
`VAN_DE` is too generic to become the robot service record. Build a dedicated Technical Case entity only after mapping the existing robot-support dataset.
Proposed object fields:
- case_id, robot_id, account_id/school, symptom, evidence/media, severity, status;
- current_holder, owner_user_id;
- next_action, next_action_date;
- diagnosis, resolution, parts/repair note;
- loan/replacement state, return state;
- created_at, updated_at, deleted_at/restore metadata.

Do not mix this with general School or Opportunity records.

### 5. Professional documents
Introduce governed outputs later using a common document registry rather than ad-hoc PDF links. Priority outputs:
1. School Proposal
2. Implementation Brief
3. Training Record
4. Robot Service Record
5. Operational Review

Each external document needs School, unique reference, date, version, status, creator and file link.

## Existing data that must be preserved
- All current `TRUONG`, `TIEP_CAN_TRUONG`, `CONG_VIEC`, `CAP_NHAT`, `CO_HOI`, E-profile tracking and user/role data.
- Existing stable IDs (`account_id`, `work_id`, `opp_id`, `outreach_id`).
- Timeline evidence already generated from current sources.
- Historical owner/action evidence in logs.

No destructive migration is required for Stage 1.

## Stage plan

### Stage 1 — Operating shell + School/Next Action discipline
Deliver now:
- compact enterprise shell;
- role-aware command block;
- exception-first metrics;
- missing-next-action/date hygiene signal;
- prominent School + Next Action/date presentation;
- contextual Quick Guide;
- visible data freshness;
- retain current fast startup architecture.

No schema migration.

### Stage 2 — Technical Case
- inventory and map existing robot-support dataset;
- define stable Robot + Technical Case IDs;
- additive sheets/migration + audit/soft delete;
- role-specific Technical Support dashboard;
- case lifecycle: NEW → NEED_EVIDENCE → DIAGNOSING → IN_REPAIR → WAITING_PART/WAITING_SCHOOL → LOANED/REPLACED → READY_RETURN → RESOLVED;
- next action/date mandatory for every open case.

### Stage 3 — Operational delivery objects
Only where management use is clear:
- Implementation / Program object;
- Teacher / Delivery Issue exceptions;
- role dashboard for School Ops / Teacher.

Do not import detailed classroom assessment into the primary dashboard.

### Stage 4 — Professional document engine
- common `DOCUMENT_OUTPUT` registry;
- branded templates;
- controlled PDF references/versioning;
- proposal, implementation brief, training record, robot service record, operational review.

### Stage 5 — Scale/performance hardening
When data volume requires it:
- API pagination/server search;
- stale/offline indicator;
- cache priority payload by role/context;
- lazy evidence/media;
- avoid full-Sheet downloads on navigation.

## Success criteria
- CEO identifies required decisions/exceptions in 30–60 seconds.
- Staff identifies today's work without opening Sheets/Drive.
- Every active School/Case has owner + next action/date.
- Real work evidence stays separate from audit/system edits.
- No important record disappears without traceability.
- Primary dashboard renders from cache first and never blocks on secondary modules.
- External documents are send-ready without manual reformatting.
- Sunbot Ops remains an operational workspace, not an all-in-one ERP.
