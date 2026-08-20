(function(){
  const baseRenderContent=window.renderContent;

  function longBridge(mode,subaction,payload={},token=state.token,timeoutMs=120000){
    return new Promise((resolve,reject)=>{
      const id=reqId();
      const frame=document.createElement('iframe');
      frame.name='bridge_'+id;
      frame.className='bridge-frame';
      document.body.appendChild(frame);
      const timer=setTimeout(()=>{
        pending.delete(id);
        frame.remove();
        reject(new Error('Máy chủ đang xử lý dữ liệu lâu hơn dự kiến. Hãy thử lại sau.'));
      },timeoutMs);
      pending.set(id,{resolve,reject,frame,timer});
      const form=document.createElement('form');
      form.method='POST';
      form.action=API_URL;
      form.target=frame.name;
      form.className='bridge-form';
      const fields={action:'pagesBridge',request_id:id,mode,subaction:subaction||'',token:token||'',payload:JSON.stringify(payload||{})};
      Object.entries(fields).forEach(([k,v])=>{
        const input=document.createElement('input');
        input.type='hidden';input.name=k;input.value=v;form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      form.remove();
    });
  }

  function applyFastState(data){
    state.boot=data.boot||state.boot;
    state.summary=data.summary||{};
    state.dashboard=data.dashboard||{};
    state.rows=data.rows||[];
    state.generatedAt=data.generated_at||'';
  }

  async function seedIfNeeded(data){
    if(!data||!data.needs_seed)return;
    const can=data.boot&&data.boot.can||{};
    const canSync=!!(can['ceo.view']||can['admin.people']||can['account.view_all']);
    if(!canSync)return;
    toast('Đăng nhập thành công. Đang chuẩn bị danh sách trường lần đầu…');
    const c=document.getElementById('content');
    if(c)c.innerHTML='<div class="empty">Đang chuẩn bị danh sách trường lần đầu. Bạn đã đăng nhập thành công; dữ liệu sẽ tự xuất hiện khi đồng bộ xong.</div>';
    try{
      await longBridge('syncSafe','sync',{},state.token,120000);
      const fresh=await call('fast','load',{force:true});
      applyFastState(fresh);
      renderContent();
      toast('Đã chuẩn bị xong danh sách trường.');
    }catch(err){
      if(c)c.innerHTML='<div class="empty">Đã đăng nhập. Danh sách trường chưa đồng bộ xong. Có thể bấm nút ↻ để thử lại.</div>';
      toast(err.message,true);
    }
  }

  async function loadWorkspaceAfterLogin_(){
    try{
      const data=await call('fast','load',{});
      applyFastState(data);
      state.tasks=[];
      state.tasksLoaded=false;
      renderContent();
      seedIfNeeded(data);
    }catch(e){
      const c=document.getElementById('content');
      if(c)c.innerHTML='<div class="empty"><b>Đăng nhập thành công.</b><br>Chưa tải được danh sách trường. Bấm ↻ để thử lại mà không cần đăng nhập lại.</div>';
      toast('Đã đăng nhập nhưng chưa tải được dữ liệu: '+e.message,true);
    }
  }

  window.loadApp=async function(){
    try{
      // Authentication/session bootstrap must be independent from heavy workspace loading.
      // A valid PIN should enter the shell immediately, even when Sheets/fast-load is slow.
      const boot=await call('core','bootstrap',{});
      state.boot=boot;
      state.summary=state.summary||{};
      state.dashboard=state.dashboard||{};
      state.rows=state.rows||[];
      state.tasks=[];
      state.tasksLoaded=false;
      renderApp();
      toast('Đăng nhập thành công.');
      loadWorkspaceAfterLogin_();
    }catch(e){
      if(/phiên đăng nhập|hết hạn|không còn được cấp quyền/i.test(e.message)){
        logout();toast('Phiên đăng nhập đã hết hạn.',true);
      }else{
        // Keep the issued token; do not misreport a post-auth bootstrap problem as wrong credentials.
        toast('Đã xác thực nhưng chưa khởi tạo được ứng dụng: '+e.message,true);
        const c=document.getElementById('app');
        if(c)c.innerHTML='<main class="login-shell"><section class="login-card"><h1>SUNBOT OPS</h1><p>Đã xác thực tài khoản nhưng máy chủ chưa khởi tạo được workspace.</p><button class="btn" onclick="loadApp()">Thử tải lại</button><button class="link-btn" onclick="logout()">Đăng xuất</button></section></main>';
      }
    }
  };

  window.renderContent=function(){
    if(state.tab==='tasks'&&!state.tasksLoaded){
      const c=document.getElementById('content');
      if(c)c.innerHTML='<div class="empty">Đang tải công việc…</div>';
      call('fast','tasks',{filter:'DOING'}).then(function(rows){
        state.tasks=rows||[];state.tasksLoaded=true;
        if(state.tab==='tasks'&&typeof window.renderTasks==='function')window.renderTasks();
      }).catch(function(err){toast(err.message,true);});
      return;
    }
    return baseRenderContent();
  };

  window.refreshOutreach=async function(force){
    try{
      const data=await call('fast','load',{force:!!force});
      applyFastState(data);
      if(state.tab==='outreach')renderOutreach();
      if(data.needs_seed)seedIfNeeded(data);
    }catch(e){toast(e.message,true);}
  };

  window.syncOutreach=async function(){
    if(!confirm('Đồng bộ lại danh sách trường từ bảng nghiên cứu? Dữ liệu vận hành trong Ops sẽ được giữ làm nguồn chính.'))return;
    try{
      toast('Đang đồng bộ danh sách trường…');
      const r=await longBridge('syncSafe','sync',{},state.token,120000);
      toast(r.message||'Đã đồng bộ.');
      await window.refreshOutreach(true);
    }catch(e){toast(e.message,true)}
  };
})();
