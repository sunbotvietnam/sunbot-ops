import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps-script/appsscript.json',
  'apps-script/Code.gs',
  'apps-script/Auth.gs',
  'apps-script/PasswordAuth.gs',
  'apps-script/Production.gs',
  'apps-script/CommercialIntelligence.gs',
  'apps-script/CeoIntelligence.gs',
  'apps-script/Index.html',
  'apps-script/Styles.html',
  'apps-script/Scripts.html',
  'apps-script/CommercialUi.html',
  'apps-script/CeoCockpitUi.html',
  'apps-script/OtpAuth.html',
  'schema/sheets-schema.json',
  'schema/roles.json',
  'docs/AI_CONTEXT.md',
  'docs/GOOGLE_ARCHITECTURE.md',
  'docs/COMMERCIAL_INTELLIGENCE_DATA_ARCHITECTURE.md',
  'README.md'
];

let failed = false;
for (const f of required) {
  if (!fs.existsSync(path.resolve(f))) {
    console.error('Thiếu file bắt buộc:', f);
    failed = true;
  }
}

for (const f of ['apps-script/appsscript.json','schema/sheets-schema.json','schema/roles.json']) {
  try { JSON.parse(fs.readFileSync(f,'utf8')); }
  catch (e) { console.error('JSON không hợp lệ:', f, e.message); failed = true; }
}

const schema = JSON.parse(fs.readFileSync('schema/sheets-schema.json','utf8'));
const expected = ['NHAN_SU','VAI_TRO','NHAN_SU_VAI_TRO','QUYEN_VAI_TRO','TRUONG','CO_HOI','CONG_VIEC','CAP_NHAT','VAN_DE','CONG_NO','THI_TRUONG_TIN_HIEU','DOI_THU','CHAO_BAN_THI_TRUONG','BAO_CAO_TUAN','AI_FEED','AUDIT_LOG'];
for (const s of expected) if (!schema.sheets?.[s]) { console.error('Schema thiếu sheet:', s); failed = true; }
if (Number(schema.version || 0) < 2) { console.error('Schema Commercial Intelligence phải là version >= 2'); failed = true; }
for (const f of ['expected_cash_date','lost_reason']) if (!schema.sheets?.CO_HOI?.includes(f)) { console.error('CO_HOI thiếu field:', f); failed = true; }
for (const s of ['CONG_VIEC','CAP_NHAT']) if (!schema.sheets?.[s]?.includes('opp_id')) { console.error(`${s} thiếu opp_id`); failed = true; }

const code = fs.readFileSync('apps-script/Code.gs','utf8');
for (const token of ['setupSystem','triggerWeeklyDrafts','getIntelligenceHttp_']) if (!code.includes(token)) { console.error('Backend thiếu chức năng:', token); failed = true; }

const commercial = fs.readFileSync('apps-script/CommercialIntelligence.gs','utf8');
for (const token of ['function apiSessionCommercial(','commercialCreateMarketSignal_','commercialCreateOpportunity_','commercialReviewMarketSignal_','commercialKpi_','THI_TRUONG_TIN_HIEU','CHAO_BAN_THI_TRUONG']) if (!commercial.includes(token)) { console.error('Commercial backend thiếu chức năng:', token); failed = true; }

const ceo = fs.readFileSync('apps-script/CeoIntelligence.gs','utf8');
for (const token of ['function apiSessionCeo(','ceoCockpit_','ceoWeeklyIntelligence_','weighted_pipeline','pending_market_review','team_attention']) if (!ceo.includes(token)) { console.error('CEO Intelligence backend thiếu chức năng:', token); failed = true; }

const auth = fs.readFileSync('apps-script/Auth.gs','utf8');
for (const token of ['function apiSession(','computeHmacSha256Signature','function createSessionToken_(']) if (!auth.includes(token)) { console.error('Session auth thiếu chức năng:', token); failed = true; }

const passwordAuth = fs.readFileSync('apps-script/PasswordAuth.gs','utf8');
for (const token of ['function loginAdminPassword(','ADMIN_PASSWORD_SHA256','MAX_ATTEMPTS','LOCK_SECONDS']) if (!passwordAuth.includes(token)) { console.error('Password auth thiếu chức năng:', token); failed = true; }
if (passwordAuth.includes("ADMIN_PASSWORD: '6868'") || passwordAuth.includes('ADMIN_PASSWORD = "6868"')) { console.error('Không được lưu PIN quản trị dạng rõ trong source.'); failed = true; }

const loginUi = fs.readFileSync('apps-script/OtpAuth.html','utf8');
for (const token of ['loginAdminPasswordUi','loginAdminPassword','apiSession','localStorage']) if (!loginUi.includes(token)) { console.error('Frontend password login thiếu chức năng:', token); failed = true; }

const commercialUi = fs.readFileSync('apps-script/CommercialUi.html','utf8');
for (const token of ['apiSessionCommercial','Ghi nhận thị trường','Cơ hội','KPI','saveMarketSignal','saveOpportunity','cs_competitor','marketOverview']) if (!commercialUi.includes(token)) { console.error('Commercial UI thiếu chức năng:', token); failed = true; }

const ceoUi = fs.readFileSync('apps-script/CeoCockpitUi.html','utf8');
for (const token of ['apiSessionCeo','CEO Commercial Cockpit','Weighted pipeline','CEO Weekly Intelligence','Market Intelligence']) if (!ceoUi.includes(token)) { console.error('CEO Cockpit UI thiếu chức năng:', token); failed = true; }

const index = fs.readFileSync('apps-script/Index.html','utf8');
for (const token of ['screen-commercial','CommercialUi','CeoCockpitUi','Thị trường & Cơ hội']) if (!index.includes(token)) { console.error('Index chưa nối UI:', token); failed = true; }

const forbidden = ['DATABASE_URL','PrismaClient','postgresql://'];
for (const f of required.filter(x=>fs.existsSync(x))) {
  const text = fs.readFileSync(f,'utf8');
  for (const x of forbidden) if (text.includes(x)) { console.error(`Phát hiện dấu vết backend cũ ${x} trong ${f}`); failed = true; }
}

if (failed) process.exit(1);
console.log('SUNBOT OPS validation: OK');
