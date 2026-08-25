import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps-script/appsscript.json','apps-script/Code.gs','apps-script/Auth.gs','apps-script/PasswordAuth.gs','apps-script/Production.gs',
  'apps-script/CommercialIntelligence.gs','apps-script/CeoIntelligence.gs','apps-script/Outreach.gs','apps-script/OutreachWorkspace.gs','apps-script/OutreachWorkspaceSafe.gs','apps-script/OutreachSyncSafe.gs','apps-script/PagesBridge.gs','apps-script/OtpHttp.gs',
  'apps-script/QuotationV3Refactor.gs',
  'apps-script/Index.html','apps-script/Styles.html','apps-script/Scripts.html','apps-script/CommercialUi.html','apps-script/OutreachUi.html','apps-script/CeoCockpitUi.html',
  'frontend/index.html','frontend/app.js','frontend/pin-login.js','frontend/security-session.js','frontend/workspace.js','frontend/minimal-ui.js','frontend/minimal-ui.css','frontend/styles.css',
  'schema/sheets-schema.json','schema/roles.json','docs/AI_CONTEXT.md','docs/GOOGLE_ARCHITECTURE.md','docs/COMMERCIAL_INTELLIGENCE_DATA_ARCHITECTURE.md','README.md'
];
let failed=false;
for(const f of required){if(!fs.existsSync(path.resolve(f))){console.error('Thiếu file bắt buộc:',f);failed=true;}}
for(const f of ['apps-script/appsscript.json','schema/sheets-schema.json','schema/roles.json']){try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){console.error('JSON không hợp lệ:',f,e.message);failed=true;}}

const schema=JSON.parse(fs.readFileSync('schema/sheets-schema.json','utf8'));
const expected=['NHAN_SU','VAI_TRO','NHAN_SU_VAI_TRO','QUYEN_VAI_TRO','TRUONG','CO_HOI','CONG_VIEC','CAP_NHAT','TIEP_CAN_TRUONG','VAN_DE','CONG_NO','THI_TRUONG_TIN_HIEU','DOI_THU','CHAO_BAN_THI_TRUONG','BAO_CAO_TUAN','AI_FEED','AUDIT_LOG'];
for(const s of expected)if(!schema.sheets?.[s]){console.error('Schema V1 thiếu sheet:',s);failed=true;}
if(Number(schema.version||0)<3){console.error('Schema Outreach V1 phải là version >= 3');failed=true;}
for(const f of ['expected_cash_date','lost_reason'])if(!schema.sheets?.CO_HOI?.includes(f)){console.error('CO_HOI V1 thiếu field:',f);failed=true;}
for(const s of ['CONG_VIEC','CAP_NHAT'])if(!schema.sheets?.[s]?.includes('opp_id')){console.error(`${s} V1 thiếu opp_id`);failed=true;}
for(const f of ['outreach_id','owner_user_id','email_truong','dot_trien_khai','trang_thai_thuc_hien','ngay_gui','ngay_theo_doi_lai'])if(!schema.sheets?.TIEP_CAN_TRUONG?.includes(f)){console.error('TIEP_CAN_TRUONG V1 thiếu field:',f);failed=true;}

const code=fs.readFileSync('apps-script/Code.gs','utf8');
for(const token of ['setupSystem','triggerWeeklyDrafts','getIntelligenceHttp_'])if(!code.includes(token)){console.error('Backend V1 thiếu chức năng:',token);failed=true;}
const commercial=fs.readFileSync('apps-script/CommercialIntelligence.gs','utf8');
for(const token of ['function apiSessionCommercial(','commercialCreateMarketSignal_','commercialCreateOpportunity_','commercialReviewMarketSignal_','commercialKpi_'])if(!commercial.includes(token)){console.error('Commercial backend V1 thiếu chức năng:',token);failed=true;}
const outreach=fs.readFileSync('apps-script/Outreach.gs','utf8');
for(const token of ['function apiSessionOutreach(','syncOutreachFromSource_','outreachMarkSent_','outreachCreateOpportunity_','TIEP_CAN_TRUONG'])if(!outreach.includes(token)){console.error('Outreach backend V1 thiếu chức năng:',token);failed=true;}
const safeWorkspace=fs.readFileSync('apps-script/OutreachWorkspaceSafe.gs','utf8');
for(const token of ['apiSessionOutreachWorkspaceSafe','outreachWorkspaceSaveCanonical_','source_writeback:false','CAN_GUI'])if(!safeWorkspace.includes(token)){console.error('Safe workspace V1 thiếu chức năng:',token);failed=true;}
if(safeWorkspace.includes('SOURCE_SPREADSHEET_ID')||safeWorkspace.includes('SpreadsheetApp.openById(OUTREACH.SOURCE_SPREADSHEET_ID)')){console.error('Safe workspace V1 không được write-back research sheet.');failed=true;}
const syncSafe=fs.readFileSync('apps-script/OutreachSyncSafe.gs','utf8');
for(const token of ['LockService.getScriptLock','apiSessionOutreachSyncSafe','ensureOutreachRuntimeSchemaSafe_'])if(!syncSafe.includes(token)){console.error('Safe sync V1 thiếu chức năng:',token);failed=true;}
const ceo=fs.readFileSync('apps-script/CeoIntelligence.gs','utf8');
for(const token of ['function apiSessionCeo(','ceoCockpit_','ceoWeeklyIntelligence_'])if(!ceo.includes(token)){console.error('CEO Intelligence V1 thiếu chức năng:',token);failed=true;}
const auth=fs.readFileSync('apps-script/Auth.gs','utf8');
for(const token of ['function apiSession(','computeHmacSha256Signature','function createSessionToken_('])if(!auth.includes(token)){console.error('Session auth V1 thiếu chức năng:',token);failed=true;}

const passwordAuth=fs.readFileSync('apps-script/PasswordAuth.gs','utf8');
for(const token of ['loginPinByEmail_','AUTH_CREDENTIALS','credentialVerifier_','MAX_ATTEMPTS','LOCK_SECONDS'])if(!passwordAuth.includes(token)){console.error('PIN auth V1 hardened thiếu chức năng:',token);failed=true;}
for(const forbiddenToken of ['STAFF_PIN_SHA256','ADMIN_PASSWORD_SHA256','ADMIN_SALT','STAFF_SALT'])if(passwordAuth.includes(forbiddenToken)){console.error('Không được để verifier/salt PIN cũ trong public source:',forbiddenToken);failed=true;}
for(const raw of ['5678','3456','1234','727833'])if(passwordAuth.includes(raw)){console.error('Không được lưu PIN cũ dạng rõ trong source.');failed=true;}

const pagesBridge=fs.readFileSync('apps-script/PagesBridge.gs','utf8');
for(const token of ['handlePagesBridge_','pinLogin','loginPinByEmail_','apiSessionOutreachSyncSafe','apiSessionOutreachWorkspaceSafe','sunbot-pages-response','https://sunbotvietnam.github.io'])if(!pagesBridge.includes(token)){console.error('Pages bridge V1 thiếu chức năng:',token);failed=true;}
for(const forbiddenToken of ['apiSessionOutreachContact','postMessage('+"''"+', "*")','requestOtp','verifyOtp','pagesPinLogin_','loginPassword_'])if(pagesBridge.includes(forbiddenToken)){console.error('Pages bridge V1 còn route/fallback cũ:',forbiddenToken);failed=true;}
if(!pagesBridge.includes("mode==='quotationV3'")||!pagesBridge.includes('apiSessionQuotationV3')){console.error('Pages bridge chưa nối Quotation V3 clean.');failed=true;}
const quotationV3=fs.readFileSync('apps-script/QuotationV3Refactor.gs','utf8');
for(const token of ['apiSessionQuotationV3','quotationV3Catalog_','quotationV3Materials_','quotationV3Preview_','quotationV3Save_','quotationSharedSession_'])if(!quotationV3.includes(token)){console.error('Quotation V3 backend thiếu chức năng:',token);failed=true;}
for(const forbiddenToken of ['SHARED_PASSWORD_SHA256:',"'5678'",'floor_price'])if(quotationV3.includes(forbiddenToken)){console.error('Quotation V3 chứa bí mật hoặc giá sàn không được public:',forbiddenToken);failed=true;}
const otpHttp=fs.readFileSync('apps-script/OtpHttp.gs','utf8');
if(!otpHttp.includes("action === 'pagesBridge'")){console.error('doPost V1 chưa nối GitHub Pages bridge');failed=true;}
for(const forbiddenToken of ['adminPasswordLogin','requestOtp'])if(otpHttp.includes("action === '"+forbiddenToken+"'")){console.error('doPost V1 còn auth route cũ:',forbiddenToken);failed=true;}

// V1 hiện hành dùng ID=email + mật khẩu 6 số. Session hardening nằm ở security-session.js.
const pinLogin=fs.readFileSync('frontend/pin-login.js','utf8');
for(const token of ['pinLogin','loginWithPin','ID đăng nhập','Mật khẩu','current-password'])if(!pinLogin.includes(token)){console.error('GitHub Pages V1 login hiện hành thiếu:',token);failed=true;}
for(const raw of ['5678','3456','1234','727833'])if(pinLogin.includes(raw)){console.error('Không được lưu PIN cũ trong frontend V1.');failed=true;}
const secSession=fs.readFileSync('frontend/security-session.js','utf8');
for(const token of ['sessionStorage','localStorage.removeItem','syncSafe'])if(!secSession.includes(token)){console.error('Browser session V1 hardening thiếu:',token);failed=true;}
const pagesIndex=fs.readFileSync('frontend/index.html','utf8');
for(const token of ['Content-Security-Policy','security-session.js','minimal-ui.css','pin-login.js','workspace.js','core-v2.js'])if(!pagesIndex.includes(token)){console.error('GitHub Pages V1 index chưa nối current core:',token);failed=true;}
const minimalUi=fs.readFileSync('frontend/minimal-ui.js','utf8');
for(const token of ['Kết nối','Đặt lịch','Ghi nhận','Việc tiếp theo','Mở hồ sơ','Tìm trường'])if(!minimalUi.includes(token)){console.error('Minimal UI V1 thiếu hành động:',token);failed=true;}

// V2 validation: additive, isolated data model and Vietnamese UI.
const v2Required=['apps-script/V2SchoolOS.gs','frontend/v2/index.html','frontend/v2/styles.css','frontend/v2/brand.css','frontend/v2/api.js','frontend/v2/app.js','v2/docs/ARCHITECTURE.md','v2/docs/PHASE1_ACCEPTANCE.md'];
const hasV2=v2Required.some(f=>fs.existsSync(f));
if(hasV2){
  for(const f of v2Required)if(!fs.existsSync(f)){console.error('V2 thiếu file:',f);failed=true;}
  if(!pagesBridge.includes("mode==='v2'")||!pagesBridge.includes('apiSessionV2')){console.error('Pages bridge chưa nối route V2.');failed=true;}
  const v2Server=fs.readFileSync('apps-script/V2SchoolOS.gs','utf8');
  for(const token of ['apiSessionV2','SCHOOLS','INTERACTIONS','NEXT_ACTIONS','v2CreateInteraction_','v2CreateAction_','SUPERSEDED'])if(!v2Server.includes(token)){console.error('Backend V2 thiếu nguyên tắc core:',token);failed=true;}
  const v2App=fs.readFileSync('frontend/v2/app.js','utf8');
  for(const token of ['Hôm nay','Trường','Cơ hội','Ghi nhận tương tác','Đặt việc tiếp theo','Khám phá nhu cầu'])if(!v2App.includes(token)){console.error('Frontend V2 thiếu UI tiếng Việt:',token);failed=true;}
  const v2Api=fs.readFileSync('frontend/v2/api.js','utf8');
  for(const token of ["mode:'v2'",'sessionStorage','auth.login','schools.detail','interactions.create','next_actions.create'])if(!v2Api.includes(token)){console.error('Frontend V2 API thiếu:',token);failed=true;}
  const v2Brand=fs.readFileSync('frontend/v2/brand.css','utf8');
  if(!v2Brand.includes('portal/assets/img/logo-sunbot.png')){console.error('V2 chưa dùng logo Sunbot canonical.');failed=true;}
  // Không cho phép credential thực tế xuất hiện trong public V2 source.
  const v2Public=[v2Server,v2App,v2Api,v2Brand].join('\n');
  for(const secret of ['190682','756448','990647','259694','123456'])if(v2Public.includes(secret)){console.error('V2 public source chứa mật khẩu thật.');failed=true;}
}

const forbidden=['DATABASE_URL','PrismaClient','postgresql://'];
for(const f of required.filter(x=>fs.existsSync(x))){const text=fs.readFileSync(f,'utf8');for(const x of forbidden)if(text.includes(x)){console.error(`Phát hiện dấu vết backend cũ ${x} trong ${f}`);failed=true;}}
if(failed)process.exit(1);
console.log('SUNBOT OPS V1 + School OS V2 validation: OK');
