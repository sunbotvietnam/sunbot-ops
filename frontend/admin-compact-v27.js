// Admin Workspace compact UI: keep actions and status, remove instructional prose.
(function(){
  document.body.classList.add('admin-compact');
  function trim(){
    document.querySelectorAll('#content .hero p').forEach(function(p){p.remove();});
    document.querySelectorAll('#drawerHost .section p').forEach(function(p){p.remove();});
    document.querySelectorAll('#content .hero .kicker').forEach(function(k){k.remove();});
    const map={
      'PHƯƠNG ÁN SALE GỬI':'PHƯƠNG ÁN',
      'PHÁT HÀNH HỒ SƠ':'HỒ SƠ',
      'TÀI KHOẢN & QUYỀN':'TÀI KHOẢN'
    };
    document.querySelectorAll('[data-tab]').forEach(function(b){const t=String(b.textContent||'').trim();if(map[t])b.textContent=map[t];});
  }
  const mo=new MutationObserver(trim);mo.observe(document.body,{childList:true,subtree:true});
  trim();
})();
