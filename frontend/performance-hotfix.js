(function(){
  const workspaceCache=new Map();
  const TTL=90000;
  const oldOpen=window.openSchoolWorkspace;
  const oldCall=window.call;

  function now(){return Date.now();}
  function cached(id){const x=workspaceCache.get(String(id||''));return x&&now()-x.ts<TTL?x.data:null;}
  function setCached(id,data){if(id&&data)workspaceCache.set(String(id),{ts:now(),data});}
  function skeletonFromRow(row){
    return {outreach:Object.assign({},row),account:{viec_tiep_theo:row.next_action||'',han_viec_tiep_theo:row.next_action_date||''},owner:{ho_ten:row.owner_name||'',email:''},tasks:row.next_action?[{work_id:row.next_action_work_id||'',ten_cong_viec:row.next_action,han_hoan_thanh:row.next_action_date||'',hanh_dong_tiep:row.next_action}]:[],opportunities:[],people:[],can_reassign:false,_optimistic:true};
  }
  function quickPanel(row){
    let x=document.getElementById('workspaceOverlay');
    if(!x){x=document.createElement('div');x.id='workspaceOverlay';x.className='workspace-overlay';document.body.appendChild(x);}
    x.classList.add('open');document.body.classList.add('workspace-open');
    const status=(window.STATUS_LABELS&&STATUS_LABELS[row.trang_thai_thuc_hien])||row.trang_thai_thuc_hien||'';
    const action=row.next_action||row.hanh_dong_de_xuat||'Chưa có việc tiếp theo';
    const due=row.next_action_date||row.ngay_theo_doi_lai||'';
    x.innerHTML=`<div class="workspace-panel instant-workspace"><header class="workspace-head"><div><div class="badges"><span class="badge priority">${esc(row.uu_tien||'')}</span><span class="badge">${esc(row.tinh_thanh||'')}</span></div><h2>${esc(row.ten_truong||'')}</h2><p>${esc(status)}</p></div><button class="workspace-close" id="instantClose">×</button></header><div class="instant-core"><section><span>Việc tiếp theo</span><b>${esc(action)}</b><small>${due?'Hạn '+esc(due):'Chưa có ngày cam kết'}</small></section><section><span>Phụ trách</span><b>${esc(row.owner_name||row.owner_user_id||'Chưa giao')}</b><small>${esc(row.email_truong||'')}</small></section></div><div class="workspace-loading inline-loading">Đang tải đầy đủ hồ sơ…</div></div>`;
    document.getElementById('instantClose').onclick=()=>{x.classList.remove('open');document.body.classList.remove('workspace-open');};
  }

  // Intercept detail calls so repeated school opens are effectively instant.
  window.call=async function(mode,sub,payload){
    if(mode==='outreachWorkspace'&&sub==='detail'&&payload&&payload.outreach_id){
      const hit=cached(payload.outreach_id);if(hit)return hit;
      const res=await oldCall(mode,sub,payload);setCached(payload.outreach_id,res);return res;
    }
    const res=await oldCall(mode,sub,payload);
    if(mode==='outreachWorkspace'&&['save','reassign','scheduleFollowup','completeTask'].includes(sub))workspaceCache.clear();
    return res;
  };

  // Show useful school information immediately, while legacy workspace enriches in background.
  if(typeof oldOpen==='function'){
    window.openSchoolWorkspace=function(row){quickPanel(row);return oldOpen(row);};
  }
  window.__sunbotWorkspaceCache=workspaceCache;
})();
