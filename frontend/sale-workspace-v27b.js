// Sale Workspace V27b — school context → Calculator → Admin proposal snapshot
(function(){
  const CONTEXT_KEY='sunbot_calculator_school_context';
  function currentContext(){try{return JSON.parse(localStorage.getItem(CONTEXT_KEY)||'null')}catch(e){return null}}
  function setContext(s){if(!s)return;localStorage.setItem(CONTEXT_KEY,JSON.stringify({school_id:s.school_id,school_name:s.school_name,province:s.province||'',contact_name:s.contact_name||'',set_at:new Date().toISOString()}));}
  window.addEventListener('message',function(ev){if(ev.origin!=='https://sunbotvietnam.github.io')return;const d=ev.data||{};if(d.type==='sunbot-proposal-sent'){toast('Đã gửi phương án cho Admin.');load();}});
  const oldCalc=calculatorView;
  calculatorView=function(){
    const c=currentContext();
    el('content').innerHTML=`<section class="hero"><div><span class="kicker">CÙNG MỘT MÁY TÍNH</span><h1>Máy tính phương án</h1><p>${c?`Đang tính cho <b>${esc(c.school_name)}</b>. `:'Chưa chọn trường. '}Dùng tab <b>Trình nhà trường</b> khi trao đổi trực tiếp. Hai hành động chuẩn: <b>TÓM TẮT PHƯƠNG ÁN</b> và <b>GỬI ADMIN XỬ LÝ</b>.</p></div>${c?'<button class="btn secondary" id="clearCalcSchool">Đổi trường</button>':''}</section><section class="calculator-wrap"><div class="calculator-head"><b>${c?'Phương án · '+esc(c.school_name):'Sunbot Deal Calculator'}</b><a class="btn secondary" href="${DEAL_CALCULATOR}" target="_blank" rel="noopener">Mở toàn màn hình</a></div><iframe class="calculator-frame" src="${DEAL_CALCULATOR}?workspace=sale" title="Máy tính phương án Sunbot"></iframe></section>`;
    if(c&&el('clearCalcSchool'))el('clearCalcSchool').onclick=function(){localStorage.removeItem(CONTEXT_KEY);state.tab='schools';paint();};
  };
  function enhanceDrawer(){
    const panel=document.querySelector('#drawerHost .drawer-panel');if(!panel||panel.querySelector('#openCalculatorForSchool'))return;
    const s=state.drawer&&state.drawer.school;if(!s)return;
    const sec=document.createElement('section');sec.className='section';sec.innerHTML='<h3>Phương án</h3><button class="btn" id="openCalculatorForSchool">Mở Máy tính cho trường này</button><p style="color:#718096;font-size:12px;margin:8px 0 0">Tên trường được mang sang Máy tính; khi chốt, bấm GỬI ADMIN XỬ LÝ để gửi nguyên snapshot.</p>';
    const first=panel.querySelector('.section');if(first)panel.insertBefore(sec,first);else panel.appendChild(sec);
    sec.querySelector('#openCalculatorForSchool').onclick=function(){setContext(s);state.drawer=null;el('drawerHost').innerHTML='';state.tab='calculator';render();};
  }
  const obs=new MutationObserver(enhanceDrawer);obs.observe(document.documentElement,{childList:true,subtree:true});
})();
