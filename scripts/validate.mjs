import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps-script/appsscript.json','apps-script/Code.gs','apps-script/Auth.gs','apps-script/PasswordAuth.gs','apps-script/Production.gs',
  'apps-script/CommercialIntelligence.gs','apps-script/CeoIntelligence.gs','apps-script/Outreach.gs','apps-script/OutreachWorkspace.gs','apps-script/OutreachWorkspaceSafe.gs','apps-script/OutreachSyncSafe.gs','apps-script/PagesBridge.gs','apps-script/OtpHttp.gs',
  'apps-script/Index.html','apps-script/Styles.html','apps-script/Scripts.html','apps-script/CommercialUi.html','apps-script/OutreachUi.html','apps-script/CeoCockpitUi.html',
  'frontend/index.html','frontend/app.js','frontend/pin-login.js','frontend/security-session.js','frontend/workspace.js','frontend/minimal-ui.js','frontend/minimal-ui.css','frontend/styles.css',
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
for(const token of ['function apiSessionCommercial(','commercialCreateMarketSignal_','commercialCreateOpportunity_','commercialReviewMarketSignal_','commercialKpi_'])if(!commercial.includes(token)){console.error('Commercial backend thiếu chức năng:',token);failed=true;}
const outreach=fs.readFileSync('apps-script/Outreach.gs','utf8');
for(const token of ['function apiSessionOutreach(','syncOutreachFromSource_','outreachMarkSent_','outreachCreateOpportunity_','TIEP_CAN_TRUONG'])if(!outreach.includes(token)){console.error('Outreach backend thiếu chức năng:',token);failed=true;}
const safeWorkspace=fs.readFileSync('apps-script/OutreachWorkspaceSafe.gs','utf8');
for(const token of ['apiSessionOutreachWorkspaceSafe','outreachWorkspaceSaveCanonical_','source_writeback:false','CAN_GUI'])if(!safeWorkspace.includes(token)){console.error('Safe workspace thiếu chức năng:',token);failed=true;}
if(safeWorkspace.includes('SOURCE_SPREADSHEET_ID')||safeWorkspace.includes('SpreadsheetApp.openById(OUTREACH.SOURCE_SPREADSHEET_ID)')){console.error('Safe workspace không được write-back research sheet.');failed=true;}
const syncSafe=fs.readFileSync('apps-script/OutreachSyncSafe.gs','utf8');
for(const token of ['LockService.getScriptLock','apiSessionOutreachSyncSafe','ensureOutreachRuntimeSchemaSafe_'])if(!syncSafe.includes(token)){console.error('Safe sync thiếu chức năng:',token);failed=true;}
const ceo=fs.readFileSync('apps-script/CeoIntelligence.gs','utf8');
for(const token of ['function apiSessionCeo(','ceoCockpit_','ceoWeeklyIntelligence_'])if(!ceo.includes(token)){console.error('CEO Intelligence backend thiếu chức năng:',token);failed=true;}
const auth=fs.readFileSync('apps-script/Auth.gs','utf8');
for(const token of ['function apiSession(','computeHmacSha256Signature','function createSessionToken_('])if(!auth.includes(token)){console.error('Session auth thiếu chức năng:',token);failed=true;}

const passwordAuth=fs.readFileSync('apps-script/PasswordAuth.gs','utf8');
for(const token of ['loginPinByEmail_','AUTH_CREDENTIALS','credentialVerifier_','MAX_ATTEMPTS','LOCK_SECONDS'])if(!passwordAuth.includes(token)){console.error('PIN auth hardened thiếu chức năng:',token);failed=true;}
for(const forbiddenToken of ['STAFF_PIN_SHA256','ADMIN_PASSWORD_SHA256','ADMIN_SALT','STAFF_SALT'])if(passwordAuth.includes(forbiddenToken)){console.error('Không được để verifier/salt PIN cũ trong public source:',forbiddenToken);failed=true;}
for(const raw of ['5678','3456','1234','727833'])if(passwordAuth.includes(raw)){console.error('Không được lưu PIN cũ dạng rõ trong source.');failed=true;}

const pagesBridge=fs.readFileSync('apps-script/PagesBridge.gs','utf8');
for(const token of ['handlePagesBridge_','pinLogin','loginPinByEmail_','apiSessionOutreachSyncSafe','apiSessionOutreachWorkspaceSafe','sunbot-pages-response','https://sunbotvietnam.github.io'])if(!pagesBridge.includes(token)){console.error('Pages bridge hardened thiếu chức năng:',token);failed=true;}
for(const forbiddenToken of ['apiSessionOutreachContact','postMessage('+"''"+', "*")','requestOtp','verifyOtp','pagesPinLogin_','loginPassword_'])if(pagesBridge.includes(forbiddenToken)){console.error('Pages bridge còn route/fallback cũ:',forbiddenToken);failed=true;}
const otpHttp=fs.readFileSync('apps-script/OtpHttp.gs','utf8');
if(!otpHttp.includes("action === 'pagesBridge'")){console.error('doPost chưa nối GitHub Pages bridge');failed=true;}
for(const forbiddenToken of ['adminPasswordLogin','requestOtp'])if(otpHttp.includes("action === '"+forbiddenToken+"'")){console.error('doPost còn auth route cũ:',forbiddenToken);failed=true;}

const pinLogin=fs.readFileSync('frontend/pin-login.js','utf8');
for(const token of ['pinLogin','Mã PIN 6 số','loginWithPin','sessionStorage'])if(!pinLogin.includes(token)){console.error('GitHub Pages PIN login hardened thiếu chức năng:',token);failed=true;}
for(const raw of ['5678','3456','1234','727833'])if(pinLogin.includes(raw)){console.error('Không được lưu PIN cũ trong frontend.');failed=true;}
const secSession=fs.readFileSync('frontend/security-session.js','utf8');
for(const token of ['sessionStorage','localStorage.removeItem','syncSafe'])if(!secSession.includes(token)){console.error('Browser session hardening thiếu:',token);failed=true;}
const pagesIndex=fs.readFileSync('frontend/index.html','utf8');
for(const token of ['Content-Security-Policy','security-session.js','minimal-ui.js','minimal-ui.css','pin-login.js','workspace.js'])if(!pagesIndex.includes(token)){console.error('GitHub Pages index chưa nối hardening/minimal UI:',token);failed=true;}
const minimalUi=fs.readFileSync('frontend/minimal-ui.js','utf8');
for(const token of ['Kết nối','Đặt lịch','Ghi nhận','Việc tiếp theo','Mở hồ sơ','Tìm trường'])if(!minimalUi.includes(token)){console.error('Minimal UI thiếu hành động:',token);failed=true;}

const forbidden=['DATABASE_URL','PrismaClient','postgresql://'];
for(const f of required.filter(x=>fs.existsSync(x))){const text=fs.readFileSync(f,'utf8');for(const x of forbidden)if(text.includes(x)){console.error(`Phát hiện dấu vết backend cũ ${x} trong ${f}`);failed=true;}}
if(failed)process.exit(1);
console.log('SUNBOT OPS hardened validation: OK');
