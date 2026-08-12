import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps-script/appsscript.json','apps-script/Code.gs','apps-script/Auth.gs','apps-script/PasswordAuth.gs','apps-script/Production.gs',
  'apps-script/CommercialIntelligence.gs','apps-script/CeoIntelligence.gs','apps-script/Outreach.gs','apps-script/OutreachContact.gs','apps-script/OutreachWorkspace.gs','apps-script/PagesBridge.gs','apps-script/OtpHttp.gs',
  'apps-script/Index.html','apps-script/Styles.html','apps-script/Scripts.html','apps-script/CommercialUi.html','apps-script/OutreachUi.html','apps-script/OutreachContactUi.html','apps-script/CeoCockpitUi.html','apps-script/OtpAuth.html',
  'frontend/index.html','frontend/app.js','frontend/pin-login.js','frontend/workspace.js','frontend/styles.css',
  'schema/sheets-schema.json','schema/roles.json','docs/AI_CONTEXT.md','docs/GOOGLE_ARCHITECTURE.md','docs/COMMERCIAL_INTELLIGENCE_DATA_ARCHITECTURE.md','README.md'
];
let failed=false;
for(const f of required){if(!fs.existsSync(path.resolve(f))){console.error('Thiếu file bắt buộc:',f);failed=true;}}
for(const f of ['apps-script/appsscript.json','schema/sheets-schema.json','schema/roles.json']){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){console.error('JSON không hợp lệ:',f,e.message);failed=true;}}

const schema=JSON.parse(fs.readFileSync('schema/sheets-schema.json','utf8'));
const expected=['NHAN_SU','VAI_TRO','NHAN_SU_VAI_TRO','QUYEN_VAI_TRO','TRUONG','CO_HOI','CONG_VIEC','CAP_NHAT','TIEP_CAN_TRUONG','VAN_DE','CONG_NO','THI_TRUONG_TIN_HIEU','DOI_THU','CHAO_BAN_THI_TRUONG','BAO_CAO_TUAN','AI_FEED','AUDIT_LOG'];
for(const s of expected)if(!schema.sheets?.[s]){console.error('Schema thiếu sheet:',s);failed=true;}
if(Number(schema.version||0)<3){console.error('Schema Outreach phải là version >= 3');failed=true;}
for(const f of ['expected_cash_date','lost_reason'])if(!schema.sheets?.CO_HOI?.includes(f)){console.error('CO_HOI thiếu field:',f);failed=true;}
for(const s of ['CONG_VIEC','CAP_NHAT'])if(!schema.sheets?.[s]?.includes('opp_id')){console.error(`${s} thiếu opp_id`);failed=true;}
for(const f of ['outreach_id','owner_user_id','email_truong','dot_trien_khai','trang_thai_thuc_hien','ngay_gui','ngay_theo_doi_lai'])if(!schema.sheets?.TIEP_CAN_TRUONG?.includes(f)){console.error('TIEP_CAN_TRUONG thiếu field:',f);failed=true;}

const code=fs.readFileSync('apps-script/Code.gs','utf8');
for(const token of ['setupSystem','triggerWeeklyDrafts','getIntelligenceHttp_'])if(!code.includes(token)){console.error('Backend thiếu chức năng:',token);failed=true;}
const commercial=fs.readFileSync('apps-script/CommercialIntelligence.gs','utf8');
for(const token of ['function apiSessionCommercial(','commercialCreateMarketSignal_','commercialCreateOpportunity_','commercialReviewMarketSignal_','commercialKpi_','THI_TRUONG_TIN_HIEU','CHAO_BAN_THI_TRUONG'])if(!commercial.includes(token)){console.error('Commercial backend thiếu chức năng:',token);failed=true;}
const outreach=fs.readFileSync('apps-script/Outreach.gs','utf8');
for(const token of ['function apiSessionOutreach(','syncOutreachFromSource_','outreachPrepareEmail_','outreachMarkSent_','outreachCreateOpportunity_','sunbotvietnam@gmail.com','TIEP_CAN_TRUONG'])if(!outreach.includes(token)){console.error('Outreach backend thiếu chức năng:',token);failed=true;}
const outreachContact=fs.readFileSync('apps-script/OutreachContact.gs','utf8');
for(const token of ['function apiSessionOutreachContact(','VERIFY_CONTACT','CAN_GUI'])if(!outreachContact.includes(token)){console.error('Outreach contact thiếu chức năng:',token);failed=true;}
const outreachWorkspace=fs.readFileSync('apps-script/OutreachWorkspace.gs','utf8');
for(const token of ['function apiSessionOutreachWorkspace(','outreachWorkspaceDetail_','outreachWorkspaceSave_','outreachWorkspaceReassign_','outreachWorkspaceScheduleFollowup_','outreachWorkspaceCompleteTask_','CAN_GUI','WORKSPACE_SAVE'])if(!outreachWorkspace.includes(token)){console.error('Outreach workspace backend thiếu chức năng:',token);failed=true;}
const ceo=fs.readFileSync('apps-script/CeoIntelligence.gs','utf8');
for(const token of ['function apiSessionCeo(','ceoCockpit_','ceoWeeklyIntelligence_','weighted_pipeline','pending_market_review','team_attention'])if(!ceo.includes(token)){console.error('CEO Intelligence backend thiếu chức năng:',token);failed=true;}
const auth=fs.readFileSync('apps-script/Auth.gs','utf8');
for(const token of ['function apiSession(','computeHmacSha256Signature','function createSessionToken_('])if(!auth.includes(token)){console.error('Session auth thiếu chức năng:',token);failed=true;}
const pagesBridge=fs.readFileSync('apps-script/PagesBridge.gs','utf8');
for(const token of ['handlePagesBridge_','pagesPinLogin_','pinLogin','loginPassword_','apiSessionOutreach','apiSessionOutreachContact','apiSessionOutreachWorkspace','sunbot-pages-response','https://sunbotvietnam.github.io'])if(!pagesBridge.includes(token)){console.error('Pages bridge thiếu chức năng PIN/workspace:',token);failed=true;}
const otpHttp=fs.readFileSync('apps-script/OtpHttp.gs','utf8');
if(!otpHttp.includes("action === 'pagesBridge'")){console.error('doPost chưa nối GitHub Pages bridge');failed=true;}

const passwordAuth=fs.readFileSync('apps-script/PasswordAuth.gs','utf8');
for(const token of ['function loginAdminPassword(','STAFF_PIN_SHA256','MAX_ATTEMPTS','LOCK_SECONDS'])if(!passwordAuth.includes(token)){console.error('Password auth thiếu chức năng:',token);failed=true;}
for(const raw of ['5678','3456','1234'])if(passwordAuth.includes(raw)){console.error('Không được lưu PIN nhân viên dạng rõ trong source.');failed=true;}
const commercialUi=fs.readFileSync('apps-script/CommercialUi.html','utf8');
for(const token of ['apiSessionCommercial','Ghi nhận thị trường','Cơ hội','Kết quả','saveMarketSignal','saveOpportunity','cs_competitor','marketOverview','Độ phủ trường','Thông tin thị trường'])if(!commercialUi.includes(token)){console.error('Commercial UI thiếu chức năng/Việt hóa:',token);failed=true;}
const outreachUi=fs.readFileSync('apps-script/OutreachUi.html','utf8');
for(const token of ['apiSessionOutreach','Tiếp cận trường','Soạn bằng Gmail của tôi','Mở Gmail của tôi','Tôi đã gửi thư','Ghi nhận phản hồi','Tạo cơ hội','authuser='])if(!outreachUi.includes(token)){console.error('Outreach UI thiếu chức năng:',token);failed=true;}
const ceoUi=fs.readFileSync('apps-script/CeoCockpitUi.html','utf8');
for(const token of ['apiSessionCeo','Bảng điều hành kinh doanh','Giá trị cơ hội theo xác suất','Tổng hợp điều hành tuần','Thông tin thị trường','Tiếp cận trường'])if(!ceoUi.includes(token)){console.error('CEO Cockpit UI thiếu chức năng/Việt hóa:',token);failed=true;}
const index=fs.readFileSync('apps-script/Index.html','utf8');
for(const token of ['screen-commercial','CommercialUi','OutreachUi','OutreachContactUi','CeoCockpitUi','Thị trường & Cơ hội'])if(!index.includes(token)){console.error('Index chưa nối UI:',token);failed=true;}

const pages=fs.readFileSync('frontend/app.js','utf8');
for(const token of ['pagesBridge','Tiếp cận trường','Soạn bằng Gmail của tôi','sunbotvietnam@gmail.com','authuser=','markSent','createOpportunity'])if(!pages.includes(token)){console.error('GitHub Pages frontend thiếu chức năng:',token);failed=true;}
const workspace=fs.readFileSync('frontend/workspace.js','utf8');
for(const token of ['outreachWorkspace','Thông tin liên hệ & phụ trách','Soạn email','Ghi nhận phản hồi','Đặt việc tiếp theo','Tạo cơ hội kinh doanh','Đổi người phụ trách','completeTask'])if(!workspace.includes(token)){console.error('GitHub Pages workspace thiếu chức năng:',token);failed=true;}
const pinLogin=fs.readFileSync('frontend/pin-login.js','utf8');
for(const token of ['pinLogin','Mã PIN 4 số','loginWithPin'])if(!pinLogin.includes(token)){console.error('GitHub Pages PIN login thiếu chức năng:',token);failed=true;}
for(const raw of ['5678','3456','1234'])if(pinLogin.includes(raw)){console.error('Không được lưu PIN nhân viên dạng rõ trong frontend.');failed=true;}
const pagesIndex=fs.readFileSync('frontend/index.html','utf8');
for(const token of ['<title>SUNBOT OPS</title>','pin-login.js','workspace.js'])if(!pagesIndex.includes(token)){console.error('GitHub Pages index chưa nối PIN/workspace:',token);failed=true;}

const forbidden=['DATABASE_URL','PrismaClient','postgresql://'];
for(const f of required.filter(x=>fs.existsSync(x))){const text=fs.readFileSync(f,'utf8');for(const x of forbidden)if(text.includes(x)){console.error(`Phát hiện dấu vết backend cũ ${x} trong ${f}`);failed=true;}}
if(failed)process.exit(1);
console.log('SUNBOT OPS validation: OK');
