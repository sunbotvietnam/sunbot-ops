(function(){
  window.loginView=function(){
    const email=esc(state.email||'');
    el('app').innerHTML=`<main class="login-shell"><section class="login-card"><div class="logo">S</div><h1>SUNBOT OPS</h1><p>Vận hành đội ngũ · Tiếp cận trường · Theo dõi cơ hội</p>
      <label>Email công việc</label>
      <input id="loginEmail" class="input" type="email" value="${email}" placeholder="ten@gmail.com" autocomplete="username">
      <label>Mã PIN 4 số / PIN quản trị 6 số</label>
      <input id="loginPin" class="input otp" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" placeholder="••••" autocomplete="current-password">
      <button class="btn" id="pinLoginBtn">Đăng nhập</button>
      <small>Nhân viên dùng PIN 4 số. Tài khoản CEO/Admin dùng PIN quản trị 6 số.</small>
      <div id="loginMsg" class="login-msg"></div>
    </section></main>`;
    el('pinLoginBtn').onclick=loginWithPin;
    el('loginPin').addEventListener('keydown',e=>{if(e.key==='Enter')loginWithPin()});
    setTimeout(()=>{if(state.email)el('loginPin')?.focus();else el('loginEmail')?.focus();},30);
  };

  window.loginWithPin=async function(){
    const email=String(el('loginEmail')?.value||'').trim().toLowerCase();
    const pin=String(el('loginPin')?.value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Hãy nhập email hợp lệ.',true);
    if(!/^\d{4,6}$/.test(pin)||pin.length===5)return toast('PIN nhân viên gồm 4 số; PIN quản trị gồm 6 số.',true);
    state.email=email;localStorage.setItem(EMAIL_KEY,email);
    el('loginMsg').textContent='Đang đăng nhập...';
    try{
      const r=await call('pinLogin','',{email,pin},'');
      state.token=r.token;localStorage.setItem(SESSION_KEY,state.token);
      el('loginPin').value='';
      await loadApp();
    }catch(e){
      el('loginMsg').textContent=e.message;
      if(el('loginPin'))el('loginPin').value='';
      toast(e.message,true);
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    if(!state.token)window.loginView();
  });
})();
