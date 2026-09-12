// Sale Workspace V27b — school context → Calculator → Admin proposal snapshot
(function(){
  const CONTEXT_KEY='sunbot_calculator_school_context';
  function currentContext(){try{return JSON.parse(localStorage.getItem(CONTEXT_KEY)||'null')}catch(e){return null}}
  function setContext(s){if(!s)return;localStorage.setItem(CONTEXT_KEY,JSON.stringify({school_id:s.school_id,school_name:s.school_name,province:s.province||'',contact_name:s.contact_name||'',set_at:new Date().toISOString()}));}
  function saleCalcUrl(){return DEAL_CALCULATOR+'?workspace=sale';}
  window.addEventListener('message',function(ev){if(ev.origin!=='https://sunbotvietnam.github.io')return;const d=ev.data||{};if(d.type==='sunbot-proposal-sent'){toast('Đã gửi phương án cho Admin.');load();}});
  calculatorView=function(){
    const c=currentContext();
    el('content').innerHTML=`<section class="hero"><div><h1>Máy tính phương án</h1>${c?`<p><b>${esc(c.school_name)}</b></p>`:''}</div>${c?'<button class="btn secondary" id="clearCalcSchool">Đổi trường</button>':''}</section><section class="calculator-wrap"><div class="calculator-head"><b>${c?'Phương án · '+esc(c.school_name):'Sunbot Deal Calculator'}</b><a class="btn secondary" href="${saleCalcUrl()}" target="_blank" rel="noopener">Mở toàn màn hình</a></div><iframe class="calculator-frame" src="${saleCalcUrl()}" title="Máy tính phương án Sunbot"></iframe></section>`;
    if(c&&el('clearCalcSchool'))el('clearCalcSchool').onclick=function(){localStorage.removeItem(CONTEXT_KEY);state.tab='schools';paint();};
  };
  function enhanceDrawer(){
    const panel=document.querySelector('#drawerHost .drawer-panel');if(!panel||panel.querySelector('#openCalculatorForSchool'))return;
    const s=state.drawer&&state.drawer.school;if(!s)return;
    const sec=document.createElement('section');sec.className='section';sec.innerHTML='<h3>Phương án</h3><button class="btn" id="openCalculatorForSchool">Mở Máy tính</button>';
    const first=panel.querySelector('.section');if(first)panel.insertBefore(sec,first);else panel.appendChild(sec);
    sec.querySelector('#openCalculatorForSchool').onclick=function(){setContext(s);state.drawer=null;el('drawerHost').innerHTML='';state.tab='calculator';render();};
  }
  const obs=new MutationObserver(enhanceDrawer);obs.observe(document.documentElement,{childList:true,subtree:true});
})();
