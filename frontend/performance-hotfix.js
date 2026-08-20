(function(){
  const workspaceCache=new Map();
  const TTL=90000;
  const oldOpen=window.openSchoolWorkspace;
  const oldCall=window.call;
  let pendingRow=null;

  function now(){return Date.now();}
  function cached(id){const x=workspaceCache.get(String(id||''));return x&&now()-x.ts<TTL?x.data:null;}
  function setCached(id,data){if(id&&data)workspaceCache.set(String(id),{ts:now(),data});}
  function instantMarkup(row){
    const status=(window.STATUS_LABELS&&STATUS_LABELS[row.trang_thai_thuc_hien])||row.trang_thai_thuc_hien||'';
    const action=row.next_action||row.hanh_dong_de_xuat||'Chưa có việc tiếp theo';
    const due=row.next_action_date||row.ngay_theo_doi_lai||'';
    return `<header class="workspace-head"><div><div class="badges"><span class="badge priority">${esc(row.uu_tien||'')}</span><span class="badge">${esc(row.tinh_thanh||'')}</span></div><h2>${esc(row.ten_truong||'')}</h2><p>${esc(status)}</p></div><button class="workspace-close" id="instantClose">×</button></header><div class="instant-core"><section><span>Việc tiếp theo</span><b>${esc(action)}</b><small>${due?'Hạn '+esc(due):'Chưa có ngày cam kết'}</small></section><section><span>Phụ trách</span><b>${esc(row.owner_name||row.owner_user_id||'Chưa giao')}</b><small>${esc(row.email_truong||'')}</small></section></div><div class="workspace-loading inline-loading">Đang tải chi tiết, tác vụ và lịch sử…</div>`;
  }
  function paintLoadingPanel(){
    if(!pendingRow)return;
    const panel=document.querySelector('#workspaceOverlay.open .loading-panel');
    if(!panel||panel.dataset.instant==='1')return;
    panel.dataset.instant='1';panel.classList.add('instant-workspace');panel.innerHTML=instantMarkup(pendingRow);
    const close=document.getElementById('instantClose');if(close)close.onclick=()=>{document.getElementById('workspaceOverlay')?.classList.remove('open');document.body.classList.remove('workspace-open');pendingRow=null;};
  }
  function exposePrimaryActions(){
    const panel=document.querySelector('#workspaceOverlay.open .workspace-panel');
    const toolbar=panel&&panel.querySelector('.workspace-toolbar');if(!toolbar)return;
    const docs=document.getElementById('documentsBtn');
    if(docs&&!document.getElementById('primaryDocuments')){
      const b=document.createElement('button');b.id='primaryDocuments';b.className='btn primary-action';b.textContent='Tài liệu & Proposal';b.onclick=()=>docs.click();toolbar.appendChild(b);
    }
    const record=document.getElementById('primaryRecord');if(record)record.textContent='Trao đổi';
  }

  window.call=async function(mode,sub,payload){
    if(mode==='outreachWorkspace'&&sub==='detail'&&payload&&payload.outreach_id){
      const hit=cached(payload.outreach_id);if(hit)return hit;
      const res=await oldCall(mode,sub,payload);setCached(payload.outreach_id,res);return res;
    }
    const res=await oldCall(mode,sub,payload);
    if(mode==='outreachWorkspace'&&['save','reassign','scheduleFollowup','completeTask'].includes(sub))workspaceCache.clear();
    return res;
  };

  if(typeof oldOpen==='function')window.openSchoolWorkspace=function(row){pendingRow=row;const p=oldOpen(row);setTimeout(paintLoadingPanel,0);return p;};

  const obs=new MutationObserver(()=>{paintLoadingPanel();exposePrimaryActions();});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.__sunbotWorkspaceCache=workspaceCache;
})();
