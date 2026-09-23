// SUNBOT School OS V2 — Discovery → Opportunity Gate V35
// A school becomes an opportunity only after a minimum discovery threshold is met.
const V2_OPPORTUNITY_GATE=Object.freeze({
  VERSION:'2026.09.23-v35',
  DISCOVERY_SHEET:'DISCOVERIES',
  OPPORTUNITY_SHEET:'OPPORTUNITIES',
  OPEN_OPPORTUNITY:{OPEN:true,DISCOVERY:true,PROPOSAL:true,NEGOTIATION:true}
});

function v2EnsureColumnsForSheet_(sheetName,cols){
  const ss=v2Db_();let sh=ss.getSheetByName(sheetName);
  if(!sh){sh=ss.insertSheet(sheetName);sh.getRange(1,1,1,cols.length).setValues([cols]);sh.setFrozenRows(1);return sh;}
  let h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0].map(String);
  cols.forEach(function(c){if(h.indexOf(c)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(c);h.push(c);}});
  return sh;
}
function v2DiscoverySheet_(){return v2EnsureColumnsForSheet_(V2_OPPORTUNITY_GATE.DISCOVERY_SHEET,[
  'discovery_id','school_id','status','need_summary','need_confirmed','decision_maker','decision_role',
  'authority_confirmed','implementation_fit','product_interest','preferred_model','budget_signal','timing',
  'blockers','next_action','next_action_date','gate_score','gate_total','gate_status','gate_missing',
  'created_by','created_at','updated_by','updated_at'
]);}
function v2OpportunitySheet_(){return v2EnsureColumnsForSheet_(V2_OPPORTUNITY_GATE.OPPORTUNITY_SHEET,[
  'opportunity_id','school_id','owner_id','title','product','stage','status','source','discovery_id',
  'need_summary','decision_maker','implementation_fit','budget_signal','timing','next_action','next_action_date',
  'expected_value','created_by','created_at','updated_at'
]);}
function v2DiscoveryRows_(){v2DiscoverySheet_();return v2Rows_(V2_OPPORTUNITY_GATE.DISCOVERY_SHEET);}
function v2OpportunityRows_(){v2OpportunitySheet_();return v2Rows_(V2_OPPORTUNITY_GATE.OPPORTUNITY_SHEET);}
function v2Bool_(v){return v===true||String(v||'').toLowerCase()==='true'||String(v)==='1'||String(v||'').toUpperCase()==='YES';}

function v2GateDiscovery_(d){
  d=d||{};
  const checks=[
    {key:'need',ok:!!String(d.need_summary||'').trim()&&v2Bool_(d.need_confirmed),label:'Nhu cầu đã được xác nhận'},
    {key:'decision',ok:!!String(d.decision_maker||'').trim()||v2Bool_(d.authority_confirmed),label:'Đã xác định người quyết định'},
    {key:'fit',ok:['YES','MAYBE'].indexOf(String(d.implementation_fit||'').toUpperCase())>=0,label:'Có khả năng triển khai'},
    {key:'product',ok:!!String(d.product_interest||'').trim(),label:'Đã xác định hướng sản phẩm/giải pháp'},
    {key:'next',ok:!!String(d.next_action||'').trim()&&!!String(d.next_action_date||'').trim(),label:'Có việc tiếp theo và hạn'}
  ];
  const score=checks.filter(function(x){return x.ok;}).length;
  const missing=checks.filter(function(x){return !x.ok;}).map(function(x){return x.label;});
  return {score:score,total:checks.length,status:score===checks.length?'READY':'NOT_READY',missing:missing,checks:checks};
}
function v2LatestDiscoveryForSchool_(schoolId){
  return v2DiscoveryRows_().filter(function(r){return String(r.school_id)===String(schoolId);})
    .sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));})[0]||null;
}
function v2ActiveOpportunityForSchool_(schoolId){
  return v2OpportunityRows_().filter(function(r){
    return String(r.school_id)===String(schoolId)&&!['WON','LOST','CLOSED','CANCELLED','CANCELED'].includes(String(r.status||r.stage||'').toUpperCase());
  }).sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));})[0]||null;
}
function v2DiscoveryView_(r){
  if(!r)return null;
  const g=v2GateDiscovery_(r);
  return Object.assign({},r,{gate_score:g.score,gate_total:g.total,gate_status:g.status,gate_missing:g.missing,gate_checks:g.checks});
}
function v2OpportunityView_(r){
  if(!r)return null;
  const users=v2UserMap_();
  return Object.assign({},r,{owner_name:(users[String(r.owner_id||'')]||{}).display_name||String(r.owner_id||'')});
}
function v2DiscoveryGet_(u,p){
  const s=v2AssertSchool_(u,String((p||{}).school_id||''));
  const discovery=v2LatestDiscoveryForSchool_(s.school_id);
  const opportunity=v2ActiveOpportunityForSchool_(s.school_id);
  return {school:v2SchoolView_(s,v2CurrentActionMap_()[s.school_id]||null,v2UserMap_()),discovery:v2DiscoveryView_(discovery),opportunity:v2OpportunityView_(opportunity)};
}
function v2DiscoverySave_(u,p){
  p=p||{};const s=v2AssertSchool_(u,String(p.school_id||'')),now=v2Now_();
  const existing=v2LatestDiscoveryForSchool_(s.school_id);
  const data={
    need_summary:v2Clean_(p.need_summary,2000),need_confirmed:!!p.need_confirmed,
    decision_maker:v2Clean_(p.decision_maker,160),decision_role:v2Clean_(p.decision_role,120),
    authority_confirmed:!!p.authority_confirmed,implementation_fit:v2Clean_(p.implementation_fit,20).toUpperCase(),
    product_interest:v2Clean_(p.product_interest,300),preferred_model:v2Clean_(p.preferred_model,100),
    budget_signal:v2Clean_(p.budget_signal,500),timing:v2Clean_(p.timing,300),blockers:v2Clean_(p.blockers,2000),
    next_action:v2Clean_(p.next_action,500),next_action_date:String(p.next_action_date||'').slice(0,10)
  };
  const g=v2GateDiscovery_(data);
  const patch=Object.assign({},data,{status:'ACTIVE',gate_score:g.score,gate_total:g.total,gate_status:g.status,gate_missing:g.missing.join(' | '),updated_by:u.user_id,updated_at:now});
  let id;
  if(existing){
    id=String(existing.discovery_id);v2UpdateById_(V2_OPPORTUNITY_GATE.DISCOVERY_SHEET,'discovery_id',id,patch);
    v2Audit_('DISCOVERY',id,'UPDATE','','',g.status,u.user_id);
  }else{
    id='DS-'+Utilities.getUuid().slice(0,8).toUpperCase();
    v2Append_(V2_OPPORTUNITY_GATE.DISCOVERY_SHEET,Object.assign({discovery_id:id,school_id:s.school_id,created_by:u.user_id,created_at:now},patch));
    v2Audit_('DISCOVERY',id,'CREATE','','',g.status,u.user_id);
  }
  if(data.next_action&&data.next_action_date){
    try{v2CreateAction_(u,{school_id:s.school_id,action_text:data.next_action,due_date:data.next_action_date,priority:'P2'});}catch(e){}
  }
  return {ok:true,discovery_id:id,gate:g,discovery:v2DiscoveryView_(Object.assign({discovery_id:id,school_id:s.school_id},patch))};
}
function v2OpportunityOpen_(u,p){
  p=p||{};const s=v2AssertSchool_(u,String(p.school_id||'')),discovery=v2LatestDiscoveryForSchool_(s.school_id);
  if(!discovery)throw new Error('Chưa có đánh giá Discovery cho trường này.');
  const g=v2GateDiscovery_(discovery);if(g.status!=='READY')throw new Error('Chưa đủ điều kiện mở Cơ hội: '+g.missing.join('; ')+'.');
  const current=v2ActiveOpportunityForSchool_(s.school_id);if(current)return {ok:true,already_exists:true,opportunity:v2OpportunityView_(current)};
  const id='OP-'+Utilities.getUuid().slice(0,8).toUpperCase(),now=v2Now_(),product=v2Clean_(discovery.product_interest,300);
  v2Append_(V2_OPPORTUNITY_GATE.OPPORTUNITY_SHEET,{
    opportunity_id:id,school_id:s.school_id,owner_id:s.current_owner_id||u.user_id,
    title:'Cơ hội · '+String(s.school_name||''),product:product,stage:'DISCOVERY',status:'OPEN',
    source:'DISCOVERY_GATE_V35',discovery_id:discovery.discovery_id,need_summary:discovery.need_summary,
    decision_maker:discovery.decision_maker,implementation_fit:discovery.implementation_fit,
    budget_signal:discovery.budget_signal,timing:discovery.timing,next_action:discovery.next_action,
    next_action_date:discovery.next_action_date,expected_value:Number(p.expected_value||0)||0,
    created_by:u.user_id,created_at:now,updated_at:now
  });
  const oldState=String(s.relationship_state||'TARGET');
  if(['TARGET','CONTACTED','ENGAGED','NURTURE'].indexOf(oldState.toUpperCase())>=0){
    v2UpdateById_(V2_OS.S.SCHOOLS,'school_id',s.school_id,{relationship_state:'DISCOVERY',updated_at:now});
  }
  v2Audit_('OPPORTUNITY',id,'CREATE','','','DISCOVERY',u.user_id);
  try{v2CreateInteraction_(u,{school_id:s.school_id,opportunity_id:id,interaction_type:'OPPORTUNITY_OPENED',summary:'Đã đủ Discovery gate và mở Cơ hội kinh doanh: '+product+'.'});}catch(e){}
  return {ok:true,opportunity:v2OpportunityView_(v2OpportunityRows_().find(function(x){return String(x.opportunity_id)===id;}))};
}
function v2OpportunityList_(u,p){
  p=p||{};const all=String(u.role_code||'').toUpperCase()==='ADMIN'&&p.all===true;
  const schools={};v2Rows_(V2_OS.S.SCHOOLS).forEach(function(s){schools[String(s.school_id)]=s;});
  return v2OpportunityRows_().filter(function(r){
    const s=schools[String(r.school_id||'')];if(!s||!v2Truthy_(s.active))return false;
    if(!all&&!v2CanSeeSchool_(u,s))return false;
    return !['WON','LOST','CLOSED','CANCELLED','CANCELED'].includes(String(r.status||r.stage||'').toUpperCase());
  }).map(function(r){
    const out=v2OpportunityView_(r),s=schools[String(r.school_id||'')]||{};
    out.school_name=s.school_name||'';out.province=s.province||'';out.relationship_state=s.relationship_state||'';
    return out;
  }).sort(function(a,b){return String(a.next_action_date||'9999-12-31').localeCompare(String(b.next_action_date||'9999-12-31'))||String(a.school_name||'').localeCompare(String(b.school_name||''),'vi');});
}
function v2OpportunityUpdate_(u,p){
  p=p||{};const id=String(p.opportunity_id||''),r=v2OpportunityRows_().find(function(x){return String(x.opportunity_id)===id;});
  if(!r)throw new Error('Không tìm thấy Cơ hội.');
  v2AssertSchool_(u,r.school_id);
  const allowedStage=['DISCOVERY','PROPOSAL','NEGOTIATION','WON','LOST','HOLD'];
  const patch={updated_at:v2Now_()};
  if(p.stage!==undefined){const stage=String(p.stage||'').toUpperCase();if(allowedStage.indexOf(stage)<0)throw new Error('Giai đoạn cơ hội không hợp lệ.');patch.stage=stage;if(['WON','LOST'].includes(stage))patch.status=stage;else if(stage==='HOLD')patch.status='HOLD';else patch.status='OPEN';}
  if(p.next_action!==undefined)patch.next_action=v2Clean_(p.next_action,500);
  if(p.next_action_date!==undefined)patch.next_action_date=String(p.next_action_date||'').slice(0,10);
  if(p.expected_value!==undefined)patch.expected_value=Number(p.expected_value||0)||0;
  v2UpdateById_(V2_OPPORTUNITY_GATE.OPPORTUNITY_SHEET,'opportunity_id',id,patch);
  if(patch.next_action&&patch.next_action_date){try{v2CreateAction_(u,{school_id:r.school_id,opportunity_id:id,action_text:patch.next_action,due_date:patch.next_action_date,priority:'P2'});}catch(e){}}
  v2Audit_('OPPORTUNITY',id,'UPDATE','','',JSON.stringify(patch),u.user_id);
  return {ok:true,opportunity:v2OpportunityView_(v2OpportunityRows_().find(function(x){return String(x.opportunity_id)===id;}))};
}

function apiSessionV2Opportunity(sessionToken,action,payload){
  const u=v2RequireSession_(sessionToken),a=String(action||'');
  if(a==='discovery.get')return v2DiscoveryGet_(u,payload||{});
  if(a==='discovery.save')return v2DiscoverySave_(u,payload||{});
  if(a==='opportunity.open')return v2OpportunityOpen_(u,payload||{});
  if(a==='opportunity.list')return v2OpportunityList_(u,payload||{});
  if(a==='opportunity.update')return v2OpportunityUpdate_(u,payload||{});
  throw new Error('Tác vụ Discovery/Cơ hội không hợp lệ.');
}
