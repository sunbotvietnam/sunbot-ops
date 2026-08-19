function apiSessionCeoExceptions(sessionToken, action, payload){
  const user=authenticateSession_(sessionToken);payload=payload||{};
  if(roleClass_(user)!=='ADMIN')throw new Error('Chỉ CEO/Admin được xem CEO Exceptions.');
  if(String(action||'summary')!=='summary')throw new Error('Tác vụ CEO Exceptions không hợp lệ.');
  return ceoExceptionsSummary_(user);
}
function ceoExceptionsSummary_(user){
  ensureSalesAdminRuntime_();ensureDocumentSheet_();
  const rows=getAll_(OUTREACH.SHEET),tasks=getAll_('CONG_VIEC'),disc=getAll_(ENGAGEMENT.DISCOVERY_SHEET),docs=getAll_(DOC_ENGINE.SHEET),opps=getAll_('CO_HOI');
  const today=new Date();today.setHours(0,0,0,0);
  const active=function(r){return !['TAM_DUNG','THEO_DOI'].includes(String(r.trang_thai_thuc_hien||''));};
  const overdue=rows.filter(function(r){if(!active(r))return false;const d=parseServerDate_(r.ngay_theo_doi_lai||'');return d&&d<today;});
  const meetingNoDiscovery=rows.filter(function(r){if(String(r.trang_thai_thuc_hien)!=='DA_HEN_TRAO_DOI')return false;return !disc.some(function(d){return String(d.outreach_id)===String(r.outreach_id)&&String(d.completed_at||'').trim();});});
  const discoveryNoThanks=disc.filter(function(d){if(!String(d.completed_at||'').trim())return false;return !docs.some(function(x){return String(x.discovery_id)===String(d.discovery_id)&&String(x.document_type)==='MEETING_THANKS';});});
  const pendingProposal=docs.filter(function(d){return String(d.document_type)==='PROPOSAL'&&String(d.status)==='PENDING_APPROVAL';});
  const staleOpp=opps.filter(function(o){if(['WON','LOST','HOLD'].includes(String(o.trang_thai||'').toUpperCase()))return false;const d=parseServerDate_(o.updated_at||'');return d&&((today-d)/86400000)>=10;});
  const openedNoFollow=ceoOpenedWithoutFollowup_(rows,tasks);
  return{
    generated_at:now_(),
    counts:{overdue:overdue.length,profile_opened_no_followup:openedNoFollow.length,meeting_no_discovery:meetingNoDiscovery.length,discovery_no_thanks:discoveryNoThanks.length,pending_proposal:pendingProposal.length,stale_opportunity:staleOpp.length},
    top:{
      overdue:ceoExceptionRows_(overdue),profile_opened_no_followup:ceoExceptionRows_(openedNoFollow),meeting_no_discovery:ceoExceptionRows_(meetingNoDiscovery),
      discovery_no_thanks:discoveryNoThanks.slice(0,8).map(function(d){const r=findOne_(OUTREACH.SHEET,'outreach_id',d.outreach_id)||{};return{outreach_id:r.outreach_id||'',school:r.ten_truong||'',owner_user_id:r.owner_user_id||'',note:'Đã Discovery nhưng chưa tạo Phiếu ghi nhận sau meeting.'};}),
      pending_proposal:pendingProposal.slice(0,8).map(function(d){const r=findOne_(OUTREACH.SHEET,'outreach_id',d.outreach_id)||{};return{outreach_id:r.outreach_id||'',school:r.ten_truong||'',owner_user_id:r.owner_user_id||'',document_id:d.document_id||'',note:'Proposal đang chờ duyệt.'};}),
      stale_opportunity:staleOpp.slice(0,8).map(function(o){const a=findOne_('TRUONG','account_id',o.account_id)||{};return{school:a.ten_don_vi||o.ten_co_hoi||'',owner_user_id:o.owner_user_id||'',opp_id:o.opp_id||'',note:'Cơ hội không cập nhật từ '+String(o.updated_at||'')};})
    }
  };
}
function ceoExceptionRows_(list){return list.slice(0,8).map(function(r){return{outreach_id:r.outreach_id||'',school:r.ten_truong||'',owner_user_id:r.owner_user_id||'',note:r.hanh_dong_de_xuat||r.next_action||''};});}
function parseServerDate_(v){if(!v)return null;const s=String(v).trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);const d=new Date(s);return isNaN(d)?null:d;}
function ceoOpenedWithoutFollowup_(rows,tasks){
  try{
    const links=getAll_('ASSET_LINKS'),events=getAll_('ASSET_EVENTS');
    const opened={};events.forEach(function(e){const lid=String(e.link_id||e.lid||'');const type=String(e.event_type||e.type||'').toUpperCase();if(lid&&/OPEN|VIEW/.test(type))opened[lid]=true;});
    return rows.filter(function(r){const linksFor=links.filter(function(l){return String(l.outreach_id||l.source_id||'')===String(r.outreach_id||'');});if(!linksFor.some(function(l){return opened[String(l.link_id||l.lid||'')];}))return false;const openTask=tasks.some(function(t){return String(t.account_id||'')===String(r.account_id||'')&&!['DONE','CANCELLED'].includes(String(t.trang_thai||''));});return !openTask;});
  }catch(e){return[];}
}
