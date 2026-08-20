(function(){
  window.loginView=function(){
    const identifier=esc(state.email||'');
    el('app').innerHTML=`<main class="login-shell"><section class="login-card"><img class="login-logo" src="https://sunbotvietnam.github.io/portal/profile/assets/images/logo-sunbot.png" alt="Sunbot"><h1>SUNBOT OPS</h1><p>Phát triển trường · Cơ hội · Việc tiếp theo</p>
      <label>ID đăng nhập</label>
      <input id="loginEmail" class="input" type="text" value="${identifier}" placeholder="Ví dụ: tuongvan1906@gmail.com" autocomplete="username">
      <label>Mật khẩu</label>
      <input id="loginPin" class="input otp" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="••••••" autocomplete="current-password">
      <button class="btn" id="pinLoginBtn">Đăng nhập</button>
      <small>ID đăng nhập là email được Admin cấp trong SUNBOT OPS. Hệ thống không gửi mã qua email.</small>
      <div id="loginMsg" class="login-msg"></div>
    </section></main>`;
    el('pinLoginBtn').onclick=loginWithPin;el('loginPin').addEventListener('keydown',e=>{if(e.key==='Enter')loginWithPin()});setTimeout(()=>{if(state.email)el('loginPin')?.focus();else el('loginEmail')?.focus();},30);
  };
  window.loginWithPin=async function(){
    const identifier=String(el('loginEmail')?.value||'').trim().toLowerCase();const pin=String(el('loginPin')?.value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))return toast('Hãy nhập đúng ID email được cấp.',true);if(!/^\d{6}$/.test(pin))return toast('Mật khẩu phải gồm 6 số.',true);
    state.email=identifier;localStorage.setItem(EMAIL_KEY,identifier);el('loginMsg').textContent='Đang đăng nhập...';
    try{const r=await call('pinLogin','',{identifier,pin},'');state.token=r.token;localStorage.setItem(SESSION_KEY,state.token);el('loginPin').value='';await loadApp();}catch(e){el('loginMsg').textContent=e.message;if(el('loginPin'))el('loginPin').value='';toast(e.message,true);}
  };
  document.addEventListener('DOMContentLoaded',()=>{if(!state.token)window.loginView();});
})();
