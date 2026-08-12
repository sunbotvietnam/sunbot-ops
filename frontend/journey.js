(function(){
  const SCENARIOS=[['NEW','Kết nối lần đầu'],['KNOWN','Kết nối lại'],['FORMER','Tái kết nối'],['CURRENT','Trao đổi năm học mới']];
  const ASSETS=[['PROFILE_PUBLIC','Hồ sơ số – Công lập'],['PROFILE_PRIVATE','Hồ sơ số – Tư thục']];

  function currentRowFromWorkspace(){
    const head=document.querySelector('#workspaceOverlay .workspace-head');
    if(!head)return null;
    const name=(head.querySelector('h2')?.textContent||'').trim();
    const badges=[...head.querySelectorAll('.badge')].map(x=>(x.textContent||'').trim());
    const province=badges.length>1?badges[1]:'';
    return (state.rows||[]).find(r=>String(r.ten_truong||'').trim()===name && (!province||String(r.tinh_thanh||'').trim()===province)) ||
      (state.rows||[]).find(r=>String(r.ten_truong||'').trim()===name) || null;
  }

  function decorate(){
    const toolbar=document.querySelector('#workspaceOverlay.open .workspace-toolbar');
    if(!toolbar||document.getElementById('journeyComposeBtn'))return;
    const row=currentRowFromWorkspace();if(!row)return;
    const old=document.getElementById('wsEmail');if(old)old.style.display='none';
    const btn=document.createElement('button');btn.id='journeyComposeBtn';btn.className='btn';btn.textContent='✉ Soạn lời kết nối';
    btn.onclick=()=>openComposer(row);
    toolbar.prepend(btn);
    const assetBtn=document.createElement('button');assetBtn.id='journeyAssetBtn';assetBtn.className='btn secondary';assetBtn.textContent='🔗 Gửi hồ sơ số';
    assetBtn.onclick=()=>openComposer(row,true);
    toolbar.insertBefore(assetBtn,btn.nextSibling);
  }

  async function openComposer(row,assetOnly){
    const host=document.getElementById('wsSubpanel');if(!host)return;
    host.innerHTML='<div class="subpanel open"><div class="subpanel-card compact"><div class="workspace-loading">Đang chuẩn bị nội dung phù hợp…</div></div></div>';
    try{
      let p=await call('journey','prepare',{outreach_id:row.outreach_id});
      render(p,assetOnly);
    }catch(e){host.innerHTML='';toast(e.message,true)}
  }

  function render(p,assetOnly){
    const host=document.getElementById('wsSubpanel');
    host.innerHTML=`<div class="subpanel open"><div class="subpanel-card">
      <div class="subpanel-head"><div><h3>${assetOnly?'Gửi hồ sơ số':'Soạn lời kết nối'}</h3><small class="muted">Mục tiêu: mở một cuộc trao đổi 30–40 phút, chưa bán ngay.</small></div><button id="journeyClose">×</button></div>
      <div class="form-grid">
        <label>Loại quan hệ<select id="journeyScenario" class="input">${SCENARIOS.map(x=>`<option value="${x[0]}" ${x[0]===p.scenario?'selected':''}>${x[1]}</option>`).join('')}</select></label>
        <label>Hồ sơ số<select id="journeyAsset" class="input">${ASSETS.map(x=>`<option value="${x[0]}" ${x[0]===p.asset.code?'selected':''}>${x[1]}</option>`).join('')}</select></label>
      </div>
      <div class="row-actions"><a class="btn ghost" id="openAsset" target="_blank" rel="noopener" href="${esc(p.asset.url)}">Mở hồ sơ số</a><button class="btn ghost" id="copyLink">Sao chép link</button><button class="btn ghost" id="copyMessage">Sao chép tin nhắn</button></div>
      ${assetOnly?'':`<label>Tới<input id="journeyTo" class="input" value="${esc(p.to_email||'')}"></label><label>CC<input id="journeyCc" class="input" value="${esc(p.cc_email)}" readonly></label><label>Tiêu đề<input id="journeySubject" class="input" value="${esc(p.subject)}"></label><label>Nội dung email<textarea id="journeyBody" class="input mail-body">${esc(p.body)}</textarea></label>`}
      <div class="attachment-note">Không cần đính “Thư ngỏ.pdf” theo mặc định. Nội dung mở vấn đề nằm ngay trong email/tin nhắn; hồ sơ số là tài liệu xem thêm.</div>
      <div class="row-actions">${assetOnly?'':`<button class="btn" id="journeyGmail">Mở Gmail của tôi</button>`}<button class="btn secondary" id="journeyConfirm">Xác nhận đã gửi</button></div>
    </div></div>`;
    document.getElementById('journeyClose').onclick=()=>host.innerHTML='';
    document.getElementById('journeyScenario').onchange=()=>reload(p.outreach_id,assetOnly);
    document.getElementById('journeyAsset').onchange=()=>reload(p.outreach_id,assetOnly);
    document.getElementById('copyLink').onclick=()=>copyText(p.asset.url,'Đã sao chép link hồ sơ số.');
    document.getElementById('copyMessage').onclick=()=>copyText(p.message,'Đã sao chép tin nhắn.');
    if(!assetOnly)document.getElementById('journeyGmail').onclick=()=>{
      const to=document.getElementById('journeyTo').value,cc=document.getElementById('journeyCc').value,su=document.getElementById('journeySubject').value,body=document.getElementById('journeyBody').value;
      const url='https://mail.google.com/mail/?authuser='+encodeURIComponent(p.from_email)+'&view=cm&fs=1&to='+encodeURIComponent(to)+'&cc='+encodeURIComponent(cc)+'&su='+encodeURIComponent(su)+'&body='+encodeURIComponent(body);
      window.open(url,'_blank','noopener');
    };
    document.getElementById('journeyConfirm').onclick=()=>confirmSent(p,assetOnly);
  }

  async function reload(outreachId,assetOnly){
    try{
      const p=await call('journey','prepare',{outreach_id:outreachId,scenario:document.getElementById('journeyScenario').value,asset_code:document.getElementById('journeyAsset').value});render(p,assetOnly);
    }catch(e){toast(e.message,true)}
  }
  async function confirmSent(p,assetOnly){
    const channel=assetOnly?'MESSAGE':'EMAIL';
    if(!confirm('Xác nhận đã gửi nội dung này cho trường?'))return;
    try{
      const r=await call('journey','logSent',{outreach_id:p.outreach_id,scenario:document.getElementById('journeyScenario').value,asset_code:document.getElementById('journeyAsset').value,channel});
      document.getElementById('wsSubpanel').innerHTML='';toast(r.message);if(window.refreshOutreach)await window.refreshOutreach(true);
    }catch(e){toast(e.message,true)}
  }
  async function copyText(text,msg){try{await navigator.clipboard.writeText(text);toast(msg)}catch(e){window.prompt('Sao chép nội dung:',text)}}

  const obs=new MutationObserver(()=>decorate());obs.observe(document.documentElement,{subtree:true,childList:true});
})();
