const SUNBOT_PAGES_ORIGIN = 'https://sunbotvietnam.github.io';
const SUNBOT_PAGES_BRIDGE_VERSION = '2026-08-25-quotation-materials';
function handlePagesBridge_(e){
  const p=e&&e.parameter?e.parameter:{};
  const requestId=String(p.request_id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
  const mode=String(p.mode||'').trim();
  const token=String(p.token||'').trim();
  let payload={};
  try{payload=p.payload?JSON.parse(String(p.payload)):{};}catch(err){return pagesBridgeHtml_(requestId,null,'Dữ liệu yêu cầu không hợp lệ.');}
  try{
    let result;
    if(mode==='v2') result=apiSessionV2(token,String(p.subaction||''),payload);
    else if(mode==='pinLogin') result=loginPinByEmail_(payload.login_id||payload.email||payload.identifier||'',payload.pin||'');
    else if(mode==='quotationAccess') result=quotationSharedLogin_(payload.password||'');
    else if(mode==='quotationShared') result=apiSessionQuotationShared(token,String(p.subaction||''),payload);
    else if(mode==='quotationMaterials') result=quotationMaterialsShared_(token);
    else if(mode==='fastShell') result=apiSessionFastShell(token,String(p.subaction||''),payload);
    else if(mode==='fast') result=apiSessionFast(token,String(p.subaction||''),payload);
    else if(mode==='syncSafe') result=apiSessionOutreachSyncSafe(token,String(p.subaction||''),payload);
    else if(mode==='journey') result=apiSessionJourney(token,String(p.subaction||''),payload);
    else if(mode==='engagement') result=apiSessionEngagement(token,String(p.subaction||''),payload);
    else if(mode==='timeline') result=apiSessionTimeline(token,String(p.subaction||''),payload);
    else if(mode==='core') result=apiSession(token,String(p.subaction||''),payload);
    else if(mode==='commercial') result=apiSessionCommercial(token,String(p.subaction||''),payload);
    else if(mode==='ceo') result=apiSessionCeo(token,String(p.subaction||''),payload);
    else if(mode==='outreach') result=apiSessionOutreach(token,String(p.subaction||''),payload);
    else if(mode==='outreachWorkspace') result=apiSessionOutreachWorkspaceSafe(token,String(p.subaction||''),payload);
    else if(mode==='outreachCreate') result=apiSessionOutreachCreate(token,payload);
    else if(mode==='quotation') result=apiSessionQuotation(token,String(p.subaction||''),payload);
    else if(mode==='proposalQuotation') result=apiSessionProposalQuotation(token,String(p.subaction||''),payload);
    else if(mode==='ceoExceptions') result=apiSessionCeoExceptions(token,String(p.subaction||''),payload);
    else if(mode==='salesAdmin') result=apiSessionSalesAdmin(token,String(p.subaction||''),payload);
    else if(mode==='documents') result=apiSessionDocuments(token,String(p.subaction||''),payload);
    else throw new Error('Tác vụ GitHub Pages không hợp lệ.');
    return pagesBridgeHtml_(requestId,result,'');
  }catch(err){return pagesBridgeHtml_(requestId,null,safeErrorMessage_(err));}
}
function pagesBridgeHtml_(requestId,result,error){
  const message={type:'sunbot-pages-response',requestId:requestId,ok:!error,result:result||null,error:error||'',bridgeVersion:SUNBOT_PAGES_BRIDGE_VERSION};
  const json=JSON.stringify(message).replace(/<\//g,'<\\/');
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){window.top.postMessage('+json+', '+JSON.stringify(SUNBOT_PAGES_ORIGIN)+');})();<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('SUNBOT OPS Bridge').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
