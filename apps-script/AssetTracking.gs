const ASSET_TRACKING = Object.freeze({
  LINKS:'ASSET_LINKS',
  SENDS:'ASSET_SENDS',
  EVENTS:'ASSET_EVENTS',
  SHORT_BASE:'https://sunbotvietnam.github.io/portal/p/?l=',
  LINK_HEADERS:['link_id','created_at','updated_at','status','account_id','outreach_id','school_name','owner_user_id','owner_name','audience','asset_type','asset_version','campaign','short_url','full_url','sent_count','last_sent_at','open_sessions','open_events','first_opened_at','last_opened_at','interest_score'],
  SEND_HEADERS:['send_id','link_id','sent_at','account_id','outreach_id','school_name','sent_by_user_id','sent_by_name','channel','recipient_contact','scenario','asset_type','status'],
  EVENT_HEADERS:['event_id','timestamp','link_id','account_id','outreach_id','owner_user_id','session_id','event_name','page_type','page_path','section_id','item_label','scroll_depth','dwell_ms','interest_delta']
});

function ensureAssetTracking_(){
  const cache=CacheService.getScriptCache();if(cache.get('asset-schema-v1')==='1')return;
  ensureTrackingSheet_(ASSET_TRACKING.LINKS,ASSET_TRACKING.LINK_HEADERS);
  ensureTrackingSheet_(ASSET_TRACKING.SENDS,ASSET_TRACKING.SEND_HEADERS);
  ensureTrackingSheet_(ASSET_TRACKING.EVENTS,ASSET_TRACKING.EVENT_HEADERS);
  cache.put('asset-schema-v1','1',21600);
}

function ensureTrackingSheet_(name,headers){
  const ss=getDb_();let sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);return sh;}
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String):[];
  headers.forEach(function(h){if(current.indexOf(h)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);current.push(h);}});
  return sh;
}

function assetTrackingLinkFor_(user,row,asset){
  ensureAssetTracking_();
  const accountId=String(row.account_id||'');const ownerId=String(user.user_id||'');const audience=String(asset.audience||'public');
  const existing=getAll_(ASSET_TRACKING.LINKS).filter(function(r){
    return String(r.account_id||'')===accountId&&String(r.owner_user_id||'')===ownerId&&String(r.audience||'')===audience&&String(r.asset_type||'')==='profile'&&String(r.status||'ACTIVE').toUpperCase()==='ACTIVE';
  }).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0];
  if(existing)return existing;
  const linkId=assetTrackingNewLinkId_(audience);
  const fullUrl=SALES_JOURNEY.PROFILE_BASE+'?audience='+encodeURIComponent(audience)+'&guided=1&lid='+encodeURIComponent(linkId)+'&asset=profile&ver=v2&campaign=2026-school-development&from=sunbot_ops#evidence';
  const shortUrl=ASSET_TRACKING.SHORT_BASE+encodeURIComponent(linkId);
  const rec={link_id:linkId,created_at:now_(),updated_at:now_(),status:'ACTIVE',account_id:accountId,outreach_id:String(row.outreach_id||''),school_name:String(row.ten_truong||''),owner_user_id:ownerId,owner_name:String(user.ho_ten||user.email||''),audience:audience,asset_type:'profile',asset_version:'v2',campaign:'2026-school-development',short_url:shortUrl,full_url:fullUrl,sent_count:0,last_sent_at:'',open_sessions:0,open_events:0,first_opened_at:'',last_opened_at:'',interest_score:0};
  append_(ASSET_TRACKING.LINKS,rec);return rec;
}

function assetTrackingNewLinkId_(audience){
  const prefix=String(audience)==='private'?'R':String(audience)==='system'?'S':'P';
  for(let i=0;i<8;i++){
    const raw=Utilities.getUuid().replace(/-/g,'').toUpperCase().slice(0,8);const id=prefix+raw;
    if(!findOne_(ASSET_TRACKING.LINKS,'link_id',id))return id;
  }
  throw new Error('Không tạo được mã E-profile duy nhất.');
}

function assetTrackingRecordSend_(user,row,link,channel,scenario,recipient){
  ensureAssetTracking_();
  const sendId=id_('SND');
  append_(ASSET_TRACKING.SENDS,{send_id:sendId,link_id:link.link_id,sent_at:now_(),account_id:row.account_id||'',outreach_id:row.outreach_id||'',school_name:row.ten_truong||'',sent_by_user_id:user.user_id,sent_by_name:user.ho_ten||user.email,channel:String(channel||'EMAIL').toUpperCase(),recipient_contact:String(recipient||''),scenario:String(scenario||''),asset_type:'profile',status:'SENT'});
  const count=Number(link.sent_count||0)+1;
  updateById_(ASSET_TRACKING.LINKS,'link_id',link.link_id,{sent_count:count,last_sent_at:now_(),updated_at:now_()});
  return sendId;
}

function assetTrackingPublicEvent_(body){
  ensureAssetTracking_();
  const type=String(body&&body.type||'event');const p=body&&body.payload||{};const linkId=String(p.link_id||'').trim();
  if(!/^[PRS][A-F0-9]{8}$/.test(linkId))return {ok:true,ignored:true};
  const link=findOne_(ASSET_TRACKING.LINKS,'link_id',linkId);if(!link||String(link.status||'ACTIVE').toUpperCase()!=='ACTIVE')return {ok:true,ignored:true};
  if(type!=='event')return {ok:true,ignored:true};
  const eventName=String(p.event_name||'').slice(0,40);
  const allowed=['page_view','section_view','section_exit','scroll_depth','cta_click','model_open','page_exit','click'];
  if(allowed.indexOf(eventName)<0)return {ok:true,ignored:true};
  const sessionId=String(p.session_id||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
  if(!sessionId)return {ok:true,ignored:true};
  const cache=CacheService.getScriptCache();const rateKey='asset-rate:'+linkId+':'+sessionId;const n=Number(cache.get(rateKey)||0);
  if(n>160)return {ok:true,ignored:true};cache.put(rateKey,String(n+1),3600);
  const section=String(p.section_id||'').slice(0,100);const item=String(p.item_label||'').slice(0,160);
  let delta=0;if(eventName==='page_view')delta=10;else if(eventName==='section_view'&&/evidence|trust|models|fit|child|program/i.test(section))delta=4;else if(eventName==='cta_click')delta=8;else if(eventName==='model_open')delta=6;
  const seen=assetTrackingSessionSeen_(linkId,sessionId);
  append_(ASSET_TRACKING.EVENTS,{event_id:id_('AE'),timestamp:now_(),link_id:linkId,account_id:link.account_id||'',outreach_id:link.outreach_id||'',owner_user_id:link.owner_user_id||'',session_id:sessionId,event_name:eventName,page_type:String(p.page_type||'').slice(0,30),page_path:String(p.page_path||'').slice(0,160),section_id:section,item_label:item,scroll_depth:Number(p.scroll_depth||0),dwell_ms:Number(p.dwell_ms||0),interest_delta:delta});
  const patch={open_events:Number(link.open_events||0)+1,last_opened_at:now_(),updated_at:now_(),interest_score:Math.min(100,Number(link.interest_score||0)+delta)};
  if(!seen){patch.open_sessions=Number(link.open_sessions||0)+1;if(!link.first_opened_at)patch.first_opened_at=now_();}
  updateById_(ASSET_TRACKING.LINKS,'link_id',linkId,patch);
  if(eventName==='page_view'&&!seen){
    try{append_('CAP_NHAT',{update_id:id_('CN'),thoi_gian:now_(),user_id:link.owner_user_id||'',account_id:link.account_id||'',work_id:'',opp_id:'',loai_cap_nhat:'EPROFILE_OPEN',trang_thai_truoc:'',trang_thai_moi:'',ket_qua:'E-profile Sunbot đã được mở.',viec_tiep_theo:'Theo dõi mức độ quan tâm và phản hồi của Nhà trường',han:'',muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:link.short_url||''});}catch(ignored){}
  }
  return {ok:true};
}

function assetTrackingSessionSeen_(linkId,sessionId){
  const rows=getAll_(ASSET_TRACKING.EVENTS);for(let i=rows.length-1;i>=0&&i>=rows.length-2500;i--){if(String(rows[i].link_id)===linkId&&String(rows[i].session_id)===sessionId)return true;}return false;
}

function assetTrackingSummary_(user){
  ensureAssetTracking_();
  const canAll=!!(user.permissions&&((user.permissions['ceo.view'])||(user.permissions['admin.people'])||(user.permissions['account.view_all'])));
  let sends=getAll_(ASSET_TRACKING.SENDS);let links=getAll_(ASSET_TRACKING.LINKS);
  if(!canAll){sends=sends.filter(r=>String(r.sent_by_user_id)===String(user.user_id));links=links.filter(r=>String(r.owner_user_id)===String(user.user_id));}
  const by={};sends.forEach(function(r){const id=String(r.sent_by_user_id||'');if(!by[id])by[id]={user_id:id,name:r.sent_by_name||id,sent:0,opened_links:0};by[id].sent++;});
  const openedBy={};links.forEach(function(l){if(Number(l.open_sessions||0)>0){const id=String(l.owner_user_id||'');openedBy[id]=(openedBy[id]||0)+1;}});
  Object.keys(by).forEach(function(id){by[id].opened_links=openedBy[id]||0;});
  const prospects=links.filter(l=>Number(l.open_sessions||0)>0).sort(function(a,b){return String(b.last_opened_at||'').localeCompare(String(a.last_opened_at||''));}).slice(0,20).map(function(l){return {link_id:l.link_id,school_name:l.school_name,account_id:l.account_id,owner_user_id:l.owner_user_id,owner_name:l.owner_name,open_sessions:Number(l.open_sessions||0),open_events:Number(l.open_events||0),interest_score:Number(l.interest_score||0),last_opened_at:l.last_opened_at,short_url:l.short_url};});
  return {by_user:Object.keys(by).map(k=>by[k]).sort((a,b)=>b.sent-a.sent),opened_prospects:prospects};
}
