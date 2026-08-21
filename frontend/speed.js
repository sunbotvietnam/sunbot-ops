(function(){
  const baseRenderContent=window.renderContent;
  const CACHE_KEY='sunbot_ops_fast_workspace_v2';

  function longBridge(mode,subaction,payload={},token=state.token,timeoutMs=120000){
    return new Promise((resolve,reject)=>{
      const id=reqId();const frame=document.createElement('iframe');frame.name='bridge_'+id;frame.className='bridge-frame';document.body.appendChild(frame);
      const timer=setTimeout(()=>{pending.delete(id);frame.remove();reject(new Error('Máy chủ đang xử lý dữ liệu lâu hơn dự kiến. Hãy thử lại sau.'));},timeoutMs);
      pending.set(id,{resolve,reject,frame,timer});
      const form=document.createElement('form');form.method='POST';form.action=API_URL;form.target=frame.name;form.className='bridge-form';
      const fields={action:'pagesBridge',request_id:id,mode,subaction:subaction||'',token:token||'',payload:JSON.stringify(payload||{})};
      Object.entries(fields).forEach(([k,v])=>{const input=document.createElement('input');input.type='hidden';input.name=k;input.value=v;form.appendChild(input)});
      document.body.appendChild(form);form.submit();form.remove();
    });
  }
  function saveCachedState(data){try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),email:String(state.boot?.user?.email||state.email||''),data:{summary:data.summary||{},dashboard:data.dashboard||{},rows:data.rows||[],generated_at:data.generated_at||''}}));}catch(e){}}
  function restoreCachedState(){try{const x=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(!x||!x.data)return false;const email=String(state.boot?.user?.email||state.email||'').toLowerCase();if(x.email&&email&&String(x.email).toLowerCase()!==email)return false;state.summary=x.data.summary||{};state.dashboard=x.data.dashboard||{};state.rows=x.data.rows||[];state.generatedAt=x.data.generated_at||'';state.cacheAgeMs=Date.now()-Number(x.ts||0);return state.rows.length>0;}catch(e){return false;}}
  function applyFastState(data){state.boot=data.boot||state.boot;state.summary=data.summary||{};state.dashboard=data.dashboard||{};state.rows=data.rows||[];state.generatedAt=data.generated_at||'';saveCachedState(data);}

  async function seedIfNeeded(data){if(!data||!data.needs_seed)return;const can=data.boot&&data.boot.can||{};const canSync=!!(can['ceo.view']||can['admin.people']||can['account.view_all']);if(!canSync)return;toast('Đang chuẩn bị danh sách trường lần đầu…');try{await longBridge('syncSafe','sync',{},state.token,120000);const fresh=await call('fast','load',{force:true});applyFastState(fresh);renderContent();toast('Đã chuẩn bị xong danh sách trường.');}catch(err){toast(err.message,true);}}

  async function loadWorkspaceAfterLogin_(){
    try{const data=await bridge('fast','load',{},state.token);applyFastState(data);state.tasks=[];state.tasksLoaded=false;if(state.tab==='outreach')renderOutreach();seedIfNeeded(data);}catch(e){if(!(state.rows||[]).length){const c=document.getElementById('content');if(c)c.innerHTML='<div class="empty"><b>Đăng nhập thành công.</b><br>Chưa tải được danh sách trường. Bấm ↻ để thử lại mà không cần đăng nhập lại.</div>';}toast('Chưa đồng bộ được dữ liệu mới: '+e.message,true);}
  }

  window.loadApp=async function(){
    try{
      const boot=await bridge('core','bootstrap',{},state.token);state.boot=boot;state.tasks=[];state.tasksLoaded=false;
      const restored=restoreCachedState();if(!restored){state.summary={};state.dashboard={};state.rows=[];state.generatedAt='';}
      renderApp();
      toast(restored?'Đã mở dữ liệu gần nhất. Đang đồng bộ…':'Đăng nhập thành công. Đang tải trường…');
      loadWorkspaceAfterLogin_();
    }catch(e){if(/phiên đăng nhập|hết hạn|không còn được cấp quyền/i.test(e.message)){logout();toast('Phiên đăng nhập đã hết hạn.',true)}else{toast('Đã xác thực nhưng chưa khởi tạo được ứng dụng: '+e.message,true);const c=document.getElementById('app');if(c)c.innerHTML='<main class="login-shell"><section class="login-card"><h1>SUNBOT OPS</h1><p>Đã xác thực tài khoản nhưng máy chủ chưa khởi tạo được workspace.</p><button class="btn" onclick="loadApp()">Thử tải lại</button><button class="link-btn" onclick="logout()">Đăng xuất</button></section></main>';}}
  };

  window.renderContent=function(){if(state.tab==='tasks'&&!state.tasksLoaded){const c=document.getElementById('content');if(c)c.innerHTML='<div class="empty">Đang tải công việc…</div>';bridge('fast','tasks',{filter:'DOING'},state.token).then(function(rows){state.tasks=rows||[];state.tasksLoaded=true;if(state.tab==='tasks'&&typeof window.renderTasks==='function')window.renderTasks();}).catch(function(err){toast(err.message,true);});return;}return baseRenderContent();};
  window.refreshOutreach=async function(force){try{const data=await bridge('fast','load',{force:!!force},state.token);applyFastState(data);if(state.tab==='outreach')renderOutreach();if(data.needs_seed)seedIfNeeded(data);}catch(e){toast(e.message,true);}};
  window.syncOutreach=async function(){if(!confirm('Đồng bộ lại danh sách trường từ bảng nghiên cứu? Dữ liệu vận hành trong Ops sẽ được giữ làm nguồn chính.'))return;try{toast('Đang đồng bộ danh sách trường…');const r=await longBridge('syncSafe','sync',{},state.token,120000);toast(r.message||'Đã đồng bộ.');await window.refreshOutreach(true);}catch(e){toast(e.message,true)}};
})();
