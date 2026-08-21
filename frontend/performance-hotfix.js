(function(){
  const workspaceCache=new Map();
  const TTL=90000;
  const oldOpen=window.openSchoolWorkspace;
  const oldCall=window.call;
  let pendingRow=null,lastMutationAt=0,prefetchTimer=null;

  function now(){return Date.now();}
  function wait(ms){return new Promise(r=>setTimeout(r,ms));}
  function cached(id){const x=workspaceCache.get(String(id||''));return x&&now()-x.ts<TTL?x.data:null;}
  function setCached(id,data){if(id&&data)workspaceCache.set(String(id),{ts:now(),data});}
  async function loadDetail(id){
    const hit=cached(id);if(hit)return hit;
    const res=await bridge('outreachWorkspace','detail',{outreach_id:id},state.token);setCached(id,res);return res;
  }
  function instantMarkup(row){
    const status=(window.STATUS_LABELS&&STATUS_LABELS[row.trang_thai_thuc_hien])||row.trang_thai_thuc_hien||'';
    const action=row.next_action||row.hanh_dong_de_xuat||'Chưa có việc tiếp theo';
    const due=row.next_action_date||row.ngay_theo_doi_lai||'';
    return `<header class="workspace-head"><div><div class="badges"><span class="badge priority">${esc(row.uu_tien||'')}</span><span class="badge">${esc(row.tinh_thanh||'')}</span></div><h2>${esc(row.ten_truong||'')}</h2><p>${esc(status)}</p></div><button class="workspace-close" id="instantClose">×</button></header><div class="instant-core"><section><span>Việc tiếp theo</span><b>${esc(action)}</b><small>${due?'Hạn '+esc(due):'Chưa có ngày cam kết'}</small></section><section><span>Phụ trách</span><b>${esc(row.owner_name||row.owner_user_id||'Chưa giao')}</b><small>${esc(row.email_truong||'')}</small></section></div><div class="workspace-loading inline-loading">Đang tải chi tiết hồ sơ…</div>`;
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
  function bindPrefetch(){
    document.querySelectorAll('.school-card .detail:not([data-prefetch-bound])').forEach(btn=>{
      btn.dataset.prefetchBound='1';
      btn.addEventListener('pointerenter',()=>{
        const id=btn.closest('.school-card')?.dataset.id;if(!id||cached(id))return;
        clearTimeout(prefetchTimer);prefetchTimer=setTimeout(()=>loadDetail(id).catch(()=>{}),220);
      },{passive:true});
    });
  }

  window.call=async function(mode,sub,payload){
    payload=payload||{};
    if(mode==='outreachWorkspace'&&sub==='detail'&&payload.outreach_id)return loadDetail(payload.outreach_id);
    if(mode==='ceoExceptions'&&sub==='summary'){await wait(1200);return bridge(mode,sub,payload,state.token);}
    if(mode==='journey'&&sub==='trackingSummary'){await wait(1600);return bridge(mode,sub,payload,state.token);}
    if(mode==='salesAdmin'&&sub==='bootstrap')return bridge(mode,sub,payload,state.token);

    if(now()-lastMutationAt<2500){
      if(mode==='outreach'&&sub==='summary')return state.summary||{};
      if(mode==='outreach'&&sub==='list')return state.rows||[];
      if(mode==='core'&&sub==='tasks')return state.tasks||[];
    }

    const res=await oldCall(mode,sub,payload);
    if(mode==='outreachWorkspace'&&['save','reassign','scheduleFollowup','completeTask'].includes(sub)){
      workspaceCache.clear();lastMutationAt=now();
      setTimeout(()=>{if(window.refreshOutreach)window.refreshOutreach(true).catch(()=>{});},850);
    }
    return res;
  };

  if(typeof oldOpen==='function')window.openSchoolWorkspace=function(row){pendingRow=row;const p=oldOpen(row);setTimeout(paintLoadingPanel,0);return p;};

  const obs=new MutationObserver(()=>{paintLoadingPanel();exposePrimaryActions();bindPrefetch();});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(bindPrefetch,200));
  window.__sunbotWorkspaceCache=workspaceCache;
})();
