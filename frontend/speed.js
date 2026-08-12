(function(){
  const baseRenderContent=window.renderContent;

  window.loadApp=async function(){
    try{
      const data=await call('fast','load',{});
      state.boot=data.boot;
      state.summary=data.summary||{};
      state.rows=data.rows||[];
      state.tasks=[];
      state.tasksLoaded=false;
      renderApp();
    }catch(e){
      if(/phiên đăng nhập|hết hạn|không còn được cấp quyền/i.test(e.message)){
        logout();toast('Phiên đăng nhập đã hết hạn.',true);
      }else{
        toast(e.message,true);
        if(typeof window.loginView==='function')window.loginView();
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

  if(typeof window.refreshOutreach==='function'){
    window.refreshOutreach=async function(force){
      try{
        const data=await call('fast','load',{force:!!force});
        state.boot=data.boot||state.boot;
        state.summary=data.summary||{};
        state.rows=data.rows||[];
        if(state.tab==='outreach')renderOutreach();
      }catch(e){toast(e.message,true);}
    };
  }
})();
