// Admin Workspace compact UI: keep actions/status, remove instructional prose, keep Admin calculator role-scoped.
(function(){
  document.body.classList.add('admin-compact');
  function adminUrl(url){try{const u=new URL(url,location.href);u.searchParams.set('workspace','admin');return u.toString();}catch(e){return url;}}
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
    document.querySelectorAll('iframe.calculator-frame').forEach(function(f){if(!f.src.includes('workspace=admin'))f.src=adminUrl(f.src);});
    document.querySelectorAll('a[href*="/partner/deal-calculator/"]').forEach(function(a){a.href=adminUrl(a.href);});
    document.querySelectorAll('#content h1').forEach(function(h){
      if(h.textContent.trim()==='Phương án Sale gửi')h.textContent='Phương án';
      if(h.textContent.trim()==='Commercial Snapshot đã khóa')h.textContent='Hồ sơ sẵn sàng';
      if(h.textContent.trim()==='Tài khoản & quyền')h.textContent='Tài khoản';
    });
    document.querySelectorAll('#content .next b').forEach(function(b){if(b.textContent.trim()==='Sẵn sàng cho Document Engine')b.textContent='Sẵn sàng phát hành';});
  }
  const mo=new MutationObserver(trim);mo.observe(document.body,{childList:true,subtree:true});
  trim();
})();
