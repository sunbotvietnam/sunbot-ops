(function(){
  try{
    const legacyToken=localStorage.getItem(SESSION_KEY);
    const legacyEmail=localStorage.getItem(EMAIL_KEY);
    if(legacyToken) localStorage.removeItem(SESSION_KEY);
    if(legacyEmail) localStorage.removeItem(EMAIL_KEY);
    state.token=sessionStorage.getItem(SESSION_KEY)||'';
    state.email=sessionStorage.getItem(EMAIL_KEY)||legacyEmail||'';
    if(state.email) sessionStorage.setItem(EMAIL_KEY,state.email);
  }catch(e){ state.token=''; }

  window.logout=function(){
    try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(EMAIL_KEY);}catch(e){}
    try{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(EMAIL_KEY);}catch(e){}
    state.token='';state.boot=null;state.tasks=[];state.rows=[];
    if(typeof window.loginView==='function')window.loginView();
  };

  window.syncOutreach=async function(){
    if(!confirm('Đồng bộ lại danh sách trường từ bảng nghiên cứu? Dữ liệu vận hành trong Ops sẽ được giữ làm nguồn chính.'))return;
    try{
      const r=await call('syncSafe','sync',{});
      toast(r.message||'Đã đồng bộ.');
      if(window.refreshOutreach)await window.refreshOutreach(true);
    }catch(e){toast(e.message,true)}
  };
})();