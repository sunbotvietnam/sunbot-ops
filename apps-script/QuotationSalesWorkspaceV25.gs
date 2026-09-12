// Quotation Sales Workspace V25 — 2026-09-12
// Một cửa vào cho Sale: Trường của tôi · Tạo đề xuất gửi Admin · dữ liệu dùng chung với School OS V2.
const QUOTATION_SALES_WORKSPACE_V25 = Object.freeze({
  VERSION:'2026.09.12-sales-workspace-v25',
  REQUEST_SHEET:'QUOTE_REQUESTS'
});

function qswNorm_(v){return String(v||'').normalize('NFKC').trim().toLocaleLowerCase('vi-VN');}
function qswMonths_(m){m=Number(m||0);return ({9:9,10:8,11:7,12:6,1:5,2:4,3:3,4:2,5:1})[m]||0;}
function qswExpectedStart_(m){m=Number(m||0);if(!qswMonths_(m))return '';const y=m>=9?2026:2027;return Utilities.formatString('%04d-%02d-01',y,m);}

function qswQuotationSession_(token){return quotationApprovalSession_(token);}
function qswV2User_(session){
  const auth=quotationApprovalAuthUsers_().find(function(r){return qswNorm_(r.LOGIN_ID)===qswNorm_(session.login_id);})||{};
  const explicit=String(auth.V2_USER_ID||auth.SCHOOL_OS_USER_ID||'').trim();
  const users=v2Rows_(V2_OS.S.USERS).filter(function(r){return v2Truthy_(r.active);});
  if(explicit){const hit=users.find(function(r){return String(r.user_id||'')===explicit;});if(hit)return {user_id:hit.user_id,login_id:hit.login_id,display_name:hit.display_name,role_code:hit.role_code,manager_user_id:hit.manager_user_id||''};}
  const candidates=[session.login_id,session.display_name].map(qswNorm_).filter(Boolean);
  const matches=users.filter(function(r){return candidates.indexOf(qswNorm_(r.login_id))>=0||candidates.indexOf(qswNorm_(r.display_name))>=0;});
  if(matches.length!==1)return null;
  const hit=matches[0];return {user_id:hit.user_id,login_id:hit.login_id,display_name:hit.display_name,role_code:hit.role_code,manager_user_id:hit.manager_user_id||''};
}
function qswContext_(token){const session=qswQuotationSession_(token);return {session:session,v2:qswV2User_(session)};}
function qswRequireV2_(ctx){if(!ctx.v2)throw new Error('Tài khoản này chưa được liên kết với Sunbot School OS. Hãy báo Admin để liên kết một lần.');return ctx.v2;}
function qswRequireAdmin_(ctx){if(String(ctx.session.role||'').toUpperCase()!=='ADMIN')throw new Error('Chỉ Admin được thực hiện tác vụ migration dữ liệu.');}

function qswBootstrap_(ctx){
  return {version:QUOTATION_SALES_WORKSPACE_V25.VERSION,school_os_linked:!!ctx.v2,school_os_user:ctx.v2||null,quotation_user:{login_id:ctx.session.login_id,display_name:ctx.session.display_name,role:ctx.session.role,region:ctx.session.region}};
}
function qswListSchools_(ctx,p){return v2ListSchools_(qswRequireV2_(ctx),p||{});}
function qswSchoolDetail_(ctx,p){return v2SchoolDetail_(qswRequireV2_(ctx),String((p||{}).school_id||''));}
function qswCreateSchool_(ctx,p){return v2CreateSchool_(qswRequireV2_(ctx),p||{});}

function qswAdvanceState_(u,schoolId,event){
  event=String(event||'').toUpperCase();if(!event)return;
  const s=v2AssertSchool_(u,schoolId),current=String(s.relationship_state||'TARGET').toUpperCase();
  let next='';
  if(event==='RESPONDED'&&['TARGET','CONTACTED'].indexOf(current)>=0)next='ENGAGED';
  if(event==='MEETING_CONFIRMED'&&['TARGET','CONTACTED','ENGAGED'].indexOf(current)>=0)next='DISCOVERY';
  if(event==='NURTURE')next='NURTURE';
  if(event==='CLOSED')next='CLOSED';
  if(next&&next!==current){v2UpdateById_(V2_OS.S.SCHOOLS,'school_id',schoolId,{relationship_state:next,updated_at:v2Now_()});v2Audit_('SCHOOL',schoolId,'RELATIONSHIP_STATE','relationship_state',current,next,u.user_id);}
}
function qswCreateInteraction_(ctx,p){
  const u=qswRequireV2_(ctx),payload=p||{};const out=v2CreateInteraction_(u,payload);qswAdvanceState_(u,payload.school_id,payload.relationship_event);return out;
}
function qswCreateNextAction_(ctx,p){return v2CreateAction_(qswRequireV2_(ctx),p||{});}
function qswCompleteNextAction_(ctx,p){return v2CompleteAction_(qswRequireV2_(ctx),String((p||{}).action_id||''));}

function qswRequestHeaders_(){return [
  'request_id','created_at','created_by','region','school_name','school_type','learner_count','existing_sunbot','asset_option','teacher_status','expected_start','decision_maker','budget_note','sales_proposal','notes','status','quote_id','handled_by','handled_at','updated_at',
  'school_id','contracting_unit','class_count','deployment_sites','program_count','sessions_per_month','start_month','months_remaining','training_teacher_count','assessment_teacher_count','existing_module_count','recovery_months','data_confidence','next_action','next_action_date','contract_scope'
];}
function qswRequestSheet_(){const sh=quotationApprovalSpreadsheet_().getSheetByName(QUOTATION_SALES_WORKSPACE_V25.REQUEST_SHEET);if(!sh)throw new Error('Thiếu bảng Yêu cầu báo giá.');return sh;}
function qswEnsureRequestHeaders_(sh){
  const required=qswRequestHeaders_();const width=Math.max(sh.getLastColumn(),required.length);if(width>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),width-sh.getMaxColumns());
  let headers=sh.getRange(1,1,1,width).getDisplayValues()[0].map(String);while(headers.length&&!String(headers[headers.length-1]||'').trim())headers.pop();
  required.forEach(function(h){if(headers.indexOf(h)<0)headers.push(h);});if(headers.length>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());
  sh.getRange(1,1,1,headers.length).setValues([headers]);return headers;
}
function qswAppendRequest_(session,p){
  const school=String(p.school_name||'').trim(),learners=Number(p.learner_count||0),sites=Math.max(1,Math.floor(Number(p.deployment_sites||1))),programs=Number(p.program_count||1)===2?2:1,sessions=Number(p.sessions_per_month||4),start=Number(p.start_month||9),months=qswMonths_(start);
  if(!school)throw new Error('Hãy chọn hoặc nhập tên trường.');if(!isFinite(learners)||learners<=0)throw new Error('Hãy nhập số trẻ dự kiến triển khai.');if([4,6,8].indexOf(sessions)<0)throw new Error('Cường độ chỉ nhận 4, 6 hoặc 8 tiết/tháng.');if(!months)throw new Error('Tháng bắt đầu phải nằm trong năm học từ tháng 9 đến tháng 5.');
  if(learners>800)throw new Error('Quy mô trên 800 trẻ cần chuyển Admin/CEO để lập phương án riêng.');
  const training=Math.max(0,Math.floor(Number(p.training_teacher_count||0))),assessment=Math.max(0,Math.floor(Number(p.assessment_teacher_count||0)));if(training>50)throw new Error('Trên 50 giáo viên đào tạo cần phương án riêng.');
  const id=quotationNorthStarRequestId_(),now=new Date(),sh=qswRequestSheet_(),headers=qswEnsureRequestHeaders_(sh);
  const record={request_id:id,created_at:now,created_by:session.login_id,region:session.region,school_name:school,school_type:String(p.school_type||''),learner_count:learners,existing_sunbot:String(p.existing_sunbot||''),asset_option:String(p.asset_option||'CHUA_XAC_DINH'),teacher_status:String(p.teacher_status||'UNKNOWN'),expected_start:qswExpectedStart_(start),decision_maker:String(p.decision_maker||''),budget_note:String(p.budget_note||''),sales_proposal:String(p.sales_proposal||''),notes:String(p.notes||''),status:'NEW',quote_id:'',handled_by:'',handled_at:'',updated_at:now,school_id:String(p.school_id||''),contracting_unit:String(p.contracting_unit||school),class_count:Math.max(0,Math.floor(Number(p.class_count||0))),deployment_sites:sites,program_count:programs,sessions_per_month:sessions,start_month:start,months_remaining:months,training_teacher_count:training,assessment_teacher_count:assessment,existing_module_count:Math.max(0,Math.floor(Number(p.existing_module_count||0))),recovery_months:Number(p.recovery_months||24)===36?36:24,data_confidence:String(p.data_confidence||'ESTIMATE'),next_action:String(p.next_action||''),next_action_date:String(p.next_action_date||''),contract_scope:String(p.contract_scope||'ONE_CONTRACTING_UNIT')};
  sh.appendRow(headers.map(function(h){return Object.prototype.hasOwnProperty.call(record,h)?record[h]:'';}));
  quotationApprovalAudit_(session,'QUOTE_REQUEST_CREATE_V25',id,{school_id:record.school_id,school_name:school,learner_count:learners,deployment_sites:sites,program_count:programs,sessions_per_month:sessions,start_month:start,months_remaining:months});
  return {ok:true,request_id:id,status:'NEW',school_name:school,learner_count:learners,months_remaining:months,created_at:now.toISOString()};
}
function qswSubmitProposal_(ctx,p){
  const out=qswAppendRequest_(ctx.session,p||{});const schoolId=String((p||{}).school_id||'').trim();
  if(schoolId&&ctx.v2){
    try{v2AssertSchool_(ctx.v2,schoolId);v2CreateInteraction_(ctx.v2,{school_id:schoolId,interaction_type:'PROPOSAL_REQUEST',summary:'Đã gửi yêu cầu để Admin lập phương án/báo giá '+out.request_id+'.',result:String((p||{}).notes||'')});}catch(e){}
    const actionText=String((p||{}).next_action||'').trim(),due=String((p||{}).next_action_date||'').slice(0,10);if(actionText&&due){try{v2CreateAction_(ctx.v2,{school_id:schoolId,action_text:actionText,due_date:due,priority:'P2'});}catch(e){}}
  }
  return out;
}

function apiSessionQuotationSalesWorkspace(token,action,payload){
  const ctx=qswContext_(token),a=String(action||''),p=payload||{};
  if(a==='bootstrap')return qswBootstrap_(ctx);
  if(a==='schools.list')return qswListSchools_(ctx,p);
  if(a==='schools.detail')return qswSchoolDetail_(ctx,p);
  if(a==='schools.create')return qswCreateSchool_(ctx,p);
  if(a==='interactions.create')return qswCreateInteraction_(ctx,p);
  if(a==='next_actions.create')return qswCreateNextAction_(ctx,p);
  if(a==='next_actions.complete')return qswCompleteNextAction_(ctx,p);
  if(a==='proposal.submit')return qswSubmitProposal_(ctx,p);
  if(a==='migration.preview'){qswRequireAdmin_(ctx);return svmPreview20260912();}
  if(a==='migration.run'){qswRequireAdmin_(ctx);return svmRun20260912();}
  throw new Error('Tác vụ Sale Workspace không hợp lệ.');
}
