// Ensure every Calculator opened from Sale Workspace is explicitly role-scoped.
(function(){
  function saleUrl(url){try{const u=new URL(url,location.href);u.searchParams.set('workspace','sale');return u.toString();}catch(e){return url;}}
  function apply(){
    document.querySelectorAll('iframe.calculator-frame').forEach(function(f){if(!f.src.includes('workspace=sale'))f.src=saleUrl(f.src);});
    document.querySelectorAll('a[href*="/partner/deal-calculator/"]').forEach(function(a){a.href=saleUrl(a.href);});
  }
  const mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});apply();
})();
