import fs from 'node:fs';
import path from 'node:path';

const required = [
  'apps-script/appsscript.json',
  'apps-script/Code.gs',
  'apps-script/Index.html',
  'apps-script/Styles.html',
  'apps-script/Scripts.html',
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
for (const token of ['setupSystem','configureSecrets','function api(','triggerWeeklyDrafts','getIntelligenceHttp_']) {
  if (!code.includes(token)) { console.error('Backend thiếu chức năng:', token); failed = true; }
}

const forbidden = ['DATABASE_URL','PrismaClient','postgresql://'];
for (const f of required.filter(x=>fs.existsSync(x))) {
  const text = fs.readFileSync(f,'utf8');
  for (const x of forbidden) if (text.includes(x)) { console.error(`Phát hiện dấu vết backend cũ ${x} trong ${f}`); failed = true; }
}

if (failed) process.exit(1);
console.log('SUNBOT OPS validation: OK');
