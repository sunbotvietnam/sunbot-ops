import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps-script/appsscript.json',
  'apps-script/Code.gs',
  'apps-script/Auth.gs',
  'apps-script/PasswordAuth.gs',
  'apps-script/Production.gs',
  'apps-script/Index.html',
  'apps-script/Styles.html',
  'apps-script/Scripts.html',
  'apps-script/OtpAuth.html',
  'schema/sheets-schema.json',
  'schema/roles.json',
  'docs/AI_CONTEXT.md',
  'docs/GOOGLE_ARCHITECTURE.md',
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
const expected = ['NHAN_SU','VAI_TRO','NHAN_SU_VAI_TRO','QUYEN_VAI_TRO','TRUONG','CO_HOI','CONG_VIEC','CAP_NHAT','VAN_DE','CONG_NO','BAO_CAO_TUAN','AI_FEED','AUDIT_LOG'];
for (const s of expected) {
  if (!schema.sheets?.[s]) { console.error('Schema thiếu sheet:', s); failed = true; }
}

const code = fs.readFileSync('apps-script/Code.gs','utf8');
for (const token of ['setupSystem','triggerWeeklyDrafts','getIntelligenceHttp_']) {
  if (!code.includes(token)) { console.error('Backend thiếu chức năng:', token); failed = true; }
}

const auth = fs.readFileSync('apps-script/Auth.gs','utf8');
for (const token of ['function apiSession(','computeHmacSha256Signature','function createSessionToken_(']) {
  if (!auth.includes(token)) { console.error('Session auth thiếu chức năng:', token); failed = true; }
}

const passwordAuth = fs.readFileSync('apps-script/PasswordAuth.gs','utf8');
for (const token of ['function loginAdminPassword(','ADMIN_PASSWORD_SHA256','MAX_ATTEMPTS','LOCK_SECONDS']) {
  if (!passwordAuth.includes(token)) { console.error('Password auth thiếu chức năng:', token); failed = true; }
}
if (passwordAuth.includes("ADMIN_PASSWORD: '6868'") || passwordAuth.includes('ADMIN_PASSWORD = "6868"')) {
  console.error('Không được lưu PIN quản trị dạng rõ trong source.');
  failed = true;
}

const loginUi = fs.readFileSync('apps-script/OtpAuth.html','utf8');
for (const token of ['loginAdminPasswordUi','loginAdminPassword','apiSession','localStorage']) {
  if (!loginUi.includes(token)) { console.error('Frontend password login thiếu chức năng:', token); failed = true; }
}

const forbidden = ['DATABASE_URL','PrismaClient','postgresql://'];
for (const f of required.filter(x=>fs.existsSync(x))) {
  const text = fs.readFileSync(f,'utf8');
  for (const x of forbidden) if (text.includes(x)) { console.error(`Phát hiện dấu vết backend cũ ${x} trong ${f}`); failed = true; }
}

if (failed) process.exit(1);
console.log('SUNBOT OPS validation: OK');
