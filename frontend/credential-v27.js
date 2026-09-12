// Shared credential guard for Sale/Admin workspaces.
(function(){
  async function enforce(){
    try{
      if(!window.state||!state.token||typeof bridge!=='function')return;
      const s=await bridge('v2Credential','state',{});
      if(!s||!s.must_change_password)return;
      const current=prompt('Tài khoản đang dùng mật khẩu tạm. Nhập lại mật khẩu tạm để đổi:','');if(!current){toast('Cần đổi mật khẩu trước khi tiếp tục.',true);return;}
      const next=prompt('Đặt mật khẩu mới (ít nhất 6 ký tự):','');if(!next||next.length<6){toast('Mật khẩu mới cần ít nhất 6 ký tự.',true);return;}
      const again=prompt('Nhập lại mật khẩu mới:','');if(next!==again){toast('Hai lần nhập mật khẩu mới chưa khớp.',true);return;}
      await bridge('v2Credential','change_password',{current_password:current,new_password:next});
      alert('Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.');
      if(typeof logout==='function')logout();
    }catch(e){if(typeof toast==='function')toast(e.message||'Không đổi được mật khẩu.',true);}
  }
  const oldLoad=window.load;
  if(typeof oldLoad==='function'){
    window.load=async function(){const r=await oldLoad.apply(this,arguments);setTimeout(enforce,120);return r;};
  }else setTimeout(enforce,500);
})();
