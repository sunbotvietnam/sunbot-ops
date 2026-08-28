import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const rows=(title,headers,data)=>[[title],[],headers,...data];
const authHeaders=['LOGIN_ID','DISPLAY_NAME','ROLE','REGION','PASSWORD_HASH_SHA256','ENABLED','NOTE'];
const quoteHeaders=['quote_id','version','created_at','created_by','client_name','client_type','combo_code','subtotal','discount_rate','discount_amount','final_amount','status','approval_required','approved_by','approved_at','notes','pricebook_version','customer_id','opportunity_id'];
const lineHeaders=['quote_id','line_no','item_id','item_name_snapshot','unit_snapshot','unit_price_snapshot','qty','discount_rate','line_total','pricing_rule_version','source_price_version'];
const catalogHeaders=['item_id','item_type','category','name','description','unit','list_price','recommended_price','floor_price','status','sales_visible','customer_visible','quote_selectable','price_mode','pricing_rule_id','valid_from','valid_to','sort_order','tags'];
const priceHeaders=['price_version_id','item_id','list_price','recommended_price','floor_price','currency','valid_from','valid_to','status','source'];
const commercialHeaders=['match_type','match_value','commercial_group','commission_base_coeff','customer_discount_user_max','hardware_burden','status','note'];

class Range {
  constructor(sheet,row,column,numRows=1,numColumns=1){Object.assign(this,{sheet,row,column,numRows,numColumns});}
  getDisplayValues(){return this.getValues().map(row=>row.map(value=>value instanceof Date?value.toISOString():String(value??'')));}
  getValues(){return Array.from({length:this.numRows},(_,r)=>Array.from({length:this.numColumns},(_,c)=>this.sheet.values[this.row-1+r]?.[this.column-1+c]??''));}
  setValue(value){this.sheet.ensure(this.row,this.column);this.sheet.values[this.row-1][this.column-1]=value;return this;}
  setValues(values){values.forEach((row,r)=>row.forEach((value,c)=>{this.sheet.ensure(this.row+r,this.column+c);this.sheet.values[this.row-1+r][this.column-1+c]=value;}));return this;}
}
class Sheet {
  constructor(name,values){this.name=name;this.values=values.map(row=>row.slice());this.maxColumns=40;}
  ensure(row,column){while(this.values.length<row)this.values.push([]);while(this.values[row-1].length<column)this.values[row-1].push('');}
  getDataRange(){const width=Math.max(1,...this.values.map(row=>row.length));return new Range(this,1,1,this.values.length,width);}
  getRange(row,column,numRows=1,numColumns=1){return new Range(this,row,column,numRows,numColumns);}
  appendRow(row){this.values.push(row.slice());}
  getLastColumn(){return Math.max(1,...this.values.map(row=>row.length));}
  getMaxColumns(){return this.maxColumns;}
  insertColumnsAfter(_after,count){this.maxColumns+=count;}
}

const sheets={
  AUTH_USERS:new Sheet('AUTH_USERS',[authHeaders,['admin','Admin','ADMIN','Toàn hệ thống',hash('adminpass'),true,''],['Thu','Thu','REGIONAL_MANAGER','Đông Bắc',hash('thupass'),true,''],['Dung','Dung','REGIONAL_MANAGER','Bắc Trung Bộ',hash('dungpass'),true,''],['Nhung','Nhung','REGIONAL_MANAGER','Hà Nội',hash('nhungpass'),true,'']]),
  CATALOG_ITEMS:new Sheet('CATALOG_ITEMS',rows('catalog',catalogHeaders,[
    ['PROGRAM_A','PROGRAM','Program','Program A','','gói',100,100,90,'ACTIVE',true,true,true,'FIXED','','2026-01-01','',1,''],
    ['SERVICE_B','SERVICE','Service','Service B','','gói',100,100,80,'ACTIVE',true,true,true,'FIXED','','2026-01-01','',2,''],
    ['BOX','HARDWARE','Thiết bị','Android Box','','bộ',1800000,1800000,1700000,'ACTIVE',true,true,true,'FIXED','','2026-01-01','',3,''],
    ['CAMP_BASIC','SERVICE','Camp','Camp Basic','','gói',1000000,1000000,900000,'ACTIVE',true,true,true,'FIXED','','2026-01-01','',4,'']
  ])),
  PRICE_VERSIONS:new Sheet('PRICE_VERSIONS',rows('prices',priceHeaders,[
    ['PV-A','PROGRAM_A',100,100,90,'VND','2026-01-01','','ACTIVE',''],['PV-B','SERVICE_B',100,100,80,'VND','2026-01-01','','ACTIVE',''],['PV-BOX','BOX',1800000,1800000,1700000,'VND','2026-01-01','','ACTIVE',''],['PV-CAMP','CAMP_BASIC',1000000,1000000,900000,'VND','2026-01-01','','ACTIVE','']
  ])),
  COMMERCIAL_CLASS:new Sheet('COMMERCIAL_CLASS',[commercialHeaders,['ITEM_TYPE','PROGRAM','A',1,.03,0,'ACTIVE',''],['ITEM_TYPE','SERVICE','B',.5,.03,0,'ACTIVE',''],['ITEM_TYPE','HARDWARE','C',0,0,.12,'ACTIVE',''],['ITEM_ID_OVERRIDE','CAMP_BASIC','MIXED_GROWTH',.5,0,0,'ACTIVE','']]),
  QUOTES:new Sheet('QUOTES',rows('quotes',quoteHeaders,[])),
  QUOTE_LINES:new Sheet('QUOTE_LINES',rows('lines',lineHeaders,[])),
  AUDIT_LOG:new Sheet('AUDIT_LOG',rows('audit',['audit_id','timestamp','user_id','action','entity_type','entity_id','detail_json'],[]))
};
const cache=new Map();let uuid=0;
const context={
  console,Date,JSON,Math,Object,String,Number,Array,RegExp,isFinite,isNaN,
  QUOTATION_SHARED_AUTH:{PRICEBOOK_ID:'fixture'},
  SpreadsheetApp:{openById:()=>({getSheetByName:name=>sheets[name]||null})},
  CacheService:{getScriptCache:()=>({put:(key,value)=>cache.set(key,value),get:key=>cache.get(key)||null})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  Utilities:{getUuid:()=>`uuid-${++uuid}`,computeDigest:(_algorithm,text)=>[...crypto.createHash('sha256').update(String(text)).digest()],DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'}},
  quotationSha256Hex_:hash,
  quotationSharedQuoteId_:()=>({id:'BG-SUNBOT-2026-0828-001',display:'BG/SUNBOT/2026/0828-001'})
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('apps-script/QuotationApprovalApi.gs','utf8'),context);

const login=(id,password)=>context.quotationApprovalLogin_(id,password);
const call=(token,action,payload={})=>context.apiSessionQuotationApproval(token,action,payload);
const tests=[];const test=(name,fn)=>tests.push({name,fn});
test('1 admin login returns ADMIN',()=>assert.equal(login('admin','adminpass').role,'ADMIN'));
test('2 regional logins return identity and region',()=>{
  assert.deepEqual(['Thu','Dung','Nhung'].map((id,i)=>{const r=login(id,["thupass","dungpass","nhungpass"][i]);return[r.display_name,r.role,r.region]}),[['Thu','REGIONAL_MANAGER','Đông Bắc'],['Dung','REGIONAL_MANAGER','Bắc Trung Bộ'],['Nhung','REGIONAL_MANAGER','Hà Nội']]);
});
test('3 invalid credential uses generic error',()=>assert.throws(()=>login('Thu','wrong'),/ID hoặc mật khẩu không đúng/));
test('4 regional catalog has no sensitive economics',()=>{const r=call(login('Thu','thupass').token,'catalog');assert.equal('floor_price' in r.items[0],false);assert.equal('economics' in r.items[0],false);});
test('5 admin catalog may include floor',()=>assert.equal(call(login('admin','adminpass').token,'catalog').items.find(x=>x.item_id==='BOX').floor_price,1700000));
test('6 server locks creator to session and NEEDS_APPROVAL',()=>{const user=login('Thu','thupass');const saved=call(user.token,'saveSnapshot',{customer_name:'School',created_by:'Dung',status:'APPROVED',lines:[{item_id:'PROGRAM_A',qty:1,proposed_unit_price:100}]});assert.equal(saved.created_by,'Thu');assert.equal(saved.status,'NEEDS_APPROVAL');});
test('7 regional cannot approve',()=>{const user=login('Thu','thupass');assert.throws(()=>call(user.token,'approveQuote',{quote_id:'BG-SUNBOT-2026-0828-001'}),/Chỉ Admin/);});
test('8 admin approve creates approved exportable quote',()=>{const admin=login('admin','adminpass');const approved=call(admin.token,'approveQuote',{quote_id:'BG-SUNBOT-2026-0828-001'});assert.equal(approved.status,'APPROVED');assert.equal(approved.exportable,true);assert.ok(sheets.AUDIT_LOG.values.some(row=>row.includes('QUOTE_APPROVE')));});
test('9 commercial revision invalidates approval',()=>{const user=login('Thu','thupass');const revised=call(user.token,'saveSnapshot',{quote_id:'BG-SUNBOT-2026-0828-001',customer_name:'School',lines:[{item_id:'PROGRAM_A',qty:2,proposed_unit_price:100}]});assert.equal(revised.version,2);assert.equal(revised.status,'NEEDS_APPROVAL');});
test('10 A/B manager max 3 percent',()=>{const user=login('Thu','thupass');assert.throws(()=>call(user.token,'saveSnapshot',{customer_name:'School',lines:[{item_id:'PROGRAM_A',qty:1,proposed_unit_price:96}]}),/vượt quá 3/);});
test('11 Camp threshold and admin 5 percent enforced',()=>{const admin=login('admin','adminpass');assert.throws(()=>call(admin.token,'saveSnapshot',{customer_name:'School',lines:[{item_id:'CAMP_BASIC',qty:10,proposed_unit_price:950000}]}),/50 triệu/);assert.equal(call(admin.token,'saveSnapshot',{customer_name:'School',lines:[{item_id:'CAMP_BASIC',qty:50,proposed_unit_price:950000}]}).status,'NEEDS_APPROVAL');});
test('12 Android Box floor enforced',()=>{const user=login('Thu','thupass');assert.throws(()=>call(user.token,'saveSnapshot',{customer_name:'School',lines:[{item_id:'BOX',qty:1,proposed_unit_price:1699999}]}),/thấp hơn mức được phép/);});
test('13 unapproved export is blocked',()=>{const user=login('Thu','thupass');assert.throws(()=>call(user.token,'exportQuote',{quote_id:'BG-SUNBOT-2026-0828-001'}),/Chỉ báo giá đã duyệt/);});

let failed=0;
for(const item of tests){try{await item.fn();console.log('PASS',item.name);}catch(error){failed++;console.error('FAIL',item.name,error.message);}}
console.log(`\n${tests.length-failed}/${tests.length} backend acceptance tests passed.`);
if(failed)process.exit(1);
