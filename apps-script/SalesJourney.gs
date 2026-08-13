const SALES_JOURNEY = Object.freeze({
  PAGES_BASE: 'https://sunbotvietnam.github.io/sunbot-ops',
  ASSETS: Object.freeze({
    PROFILE_PUBLIC: {code:'PROFILE_PUBLIC', name:'Hồ sơ số Sunbot – Trường công lập', url:'https://sunbotvietnam.github.io/sunbot-ops/profile/cong-lap.html', audience:'PUBLIC', public:true},
    PROFILE_PRIVATE:{code:'PROFILE_PRIVATE',name:'Hồ sơ số Sunbot – Trường tư thục', url:'https://sunbotvietnam.github.io/sunbot-ops/profile/tu-thuc.html',audience:'PRIVATE',public:true}
  })
});

function apiSessionJourney(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  ensureOutreachRuntimeSchema_();
  payload = payload || {};
  switch (String(action || '')) {
    case 'prepare': return journeyPrepare_(user,payload);
    case 'logSent': return journeyLogSent_(user,payload);
    case 'assets': return {assets:Object.keys(SALES_JOURNEY.ASSETS).map(function(k){return SALES_JOURNEY.ASSETS[k];})};
    default: throw new Error('Tác vụ hành trình bán hàng không hợp lệ.');
  }
}

function journeyPrepare_(user,p) {
  required_(p,['outreach_id']);
  const row = findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  const scenario = String(p.scenario || journeyScenario_(row)).toUpperCase();
  const asset = journeyAssetFor_(row,p.asset_code);
  const tpl = journeyTemplate_(user,scenario,row,asset.url);
  return {
    outreach_id:row.outreach_id,
    account_id:row.account_id||'',
    scenario:scenario,
    scenario_label:journeyScenarioLabel_(scenario),
    asset:asset,
    from_email:user.email,
    to_email:String(row.email_truong||''),
    cc_email:'sunbotvietnam@gmail.com',
    subject:tpl.subject,
    body:tpl.body,
    message:tpl.message
  };
}

function journeyScenario_(row) {
  const relation = String(row.quan_he_sunbot || row.quan_he || '').toLowerCase();
  const decision = String(row.quyet_dinh_gui || '').toLowerCase();
  const status = String(row.trang_thai_thuc_hien || '').toUpperCase();
  const combined = relation + ' ' + decision;
  if (/đang triển khai|hiện hữu|current|account hiện|vẫn triển khai|chăm sóc/.test(combined) || status === 'CHAM_SOC_ACCOUNT') return 'CURRENT';
  if (/đã từng triển khai|former|đứt đoạn|re-entry|tái kết nối|từng dùng/.test(combined)) return 'FORMER';
  if (/đã biết|từng trao đổi|demo|chưa triển khai|known/.test(combined)) return 'KNOWN';
  return 'NEW';
}

function journeyScenarioLabel_(s) {
  return ({
    NEW:'Chưa từng trao đổi với trường',
    KNOWN:'Đã từng trao đổi, chưa triển khai',
    FORMER:'Đã từng triển khai Sunbot',
    CURRENT:'Đang triển khai Sunbot'
  })[s] || 'Chưa từng trao đổi với trường';
}

function journeyAssetFor_(row, requested) {
  if (requested && SALES_JOURNEY.ASSETS[String(requested)]) return SALES_JOURNEY.ASSETS[String(requested)];
  const type = String(row.loai_hinh || row.loai_doi_tuong || '').toLowerCase();
  return /tư|private|hệ thống/.test(type) ? SALES_JOURNEY.ASSETS.PROFILE_PRIVATE : SALES_JOURNEY.ASSETS.PROFILE_PUBLIC;
}

function journeyTemplate_(user,scenario,row,profileUrl) {
  const school = String(row.ten_truong || 'Nhà trường').trim();
  const sender = String(user.ho_ten || 'bên em').trim();
  const profileLine = '\n\nEm xin phép gửi Ban Giám hiệu hồ sơ Sunbot để tiện tham khảo:\n' + profileUrl;
  const signature = '\n\nTrân trọng,\n' + sender + '\nSunbot – Kiro Việt Nam\n' + (user.email ? 'Email: ' + user.email : '');

  if (scenario === 'CURRENT') return {
    subject:'Trao đổi kế hoạch Sunbot cùng ' + school + ' trong năm học mới',
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ' bên Sunbot. Nhân dịp Nhà trường chuẩn bị cho năm học mới, em xin phép liên hệ để trao đổi về kế hoạch triển khai Sunbot trong thời gian tới.\n\nNăm học mới tiếp tục có nhiều hoạt động đổi mới về nội dung, phương pháp, trải nghiệm học tập, STEAM và ứng dụng công nghệ phù hợp với trẻ mầm non. Sunbot cũng đang cập nhật chương trình và các nội dung hỗ trợ để đồng hành tốt hơn với Nhà trường trong quá trình triển khai.' + profileLine + '\n\nSunbot mong được cùng Nhà trường trao đổi về kế hoạch năm học, nhu cầu hiện tại và những nội dung cần điều chỉnh hoặc bổ sung. Nếu thuận tiện, em xin phép hẹn Ban Giám hiệu một buổi trao đổi online khoảng 30–40 phút để hai bên cùng thống nhất hướng thực hiện.' + signature,
    message:'Em xin phép gửi Ban Giám hiệu hồ sơ Sunbot cập nhật cho năm học mới: ' + profileUrl + '. Sunbot mong được trao đổi online khoảng 30–40 phút về kế hoạch và nhu cầu triển khai của Nhà trường.'
  };

  if (scenario === 'FORMER') return {
    subject:'Sunbot xin phép kết nối lại với ' + school,
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ' bên Sunbot. Trước đây Nhà trường đã từng triển khai chương trình Sunbot, vì vậy em xin phép liên hệ lại nhân dịp chuẩn bị cho năm học mới.\n\nHiện nay STEAM, công nghệ và các hoạt động phát triển tư duy tiếp tục được nhiều trường mầm non quan tâm trong quá trình đổi mới hoạt động giáo dục. Trong thời gian vừa qua Sunbot cũng đã cập nhật chương trình, học liệu và phương án phối hợp với Nhà trường.' + profileLine + '\n\nSunbot rất mong có một buổi trao đổi để nghe thêm về nhu cầu hiện tại của Nhà trường, đồng thời cập nhật những thay đổi mới của chương trình và xem có hướng hợp tác nào phù hợp trong năm học này. Nếu thuận tiện, em xin phép hẹn Ban Giám hiệu một buổi online khoảng 30–40 phút.' + signature,
    message:'Em xin phép gửi Ban Giám hiệu hồ sơ Sunbot cập nhật: ' + profileUrl + '. Vì Nhà trường đã từng triển khai Sunbot, bên em rất mong có một buổi online khoảng 30–40 phút để cập nhật chương trình và trao đổi nhu cầu năm học mới.'
  };

  if (scenario === 'KNOWN') return {
    subject:'Sunbot xin phép kết nối lại với ' + school,
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ' bên Sunbot. Trước đây Sunbot đã từng có dịp trao đổi với Nhà trường, tuy nhiên hai bên chưa triển khai chương trình.\n\nTrong thời gian vừa qua, STEAM, công nghệ và các hoạt động phát triển tư duy cho trẻ mầm non tiếp tục được nhiều Nhà trường quan tâm. Sunbot cũng đã cập nhật chương trình và cách thức phối hợp để phù hợp hơn với điều kiện triển khai thực tế tại từng trường.' + profileLine + '\n\nNếu Nhà trường vẫn đang quan tâm đến các nội dung này, Sunbot rất mong có dịp trao đổi lại để cập nhật nhu cầu hiện tại và xem có phương án nào phù hợp. Em xin phép đề xuất một buổi trao đổi online khoảng 30–40 phút vào thời gian thuận tiện với Ban Giám hiệu.' + signature,
    message:'Em xin phép gửi Ban Giám hiệu hồ sơ Sunbot cập nhật: ' + profileUrl + '. Nếu Nhà trường vẫn quan tâm đến STEAM, công nghệ hoặc các hoạt động phát triển tư duy cho trẻ, bên em mong được trao đổi online khoảng 30–40 phút để cập nhật nhu cầu hiện tại.'
  };

  return {
    subject:'Sunbot xin phép gửi Nhà trường một số thông tin tham khảo',
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ', phụ trách kết nối các trường mầm non của Sunbot – Kiro Việt Nam.\n\nTrong những năm gần đây, STEAM, công nghệ và các hoạt động phát triển tư duy ngày càng được quan tâm trong quá trình đổi mới giáo dục mầm non. Sunbot hiện có hai chương trình Lập trình tư duy cùng Sunbot và STEAM Sáng tạo cùng Sunbot, được thiết kế riêng cho lứa tuổi mầm non.' + profileLine + '\n\nSunbot mong muốn có cơ hội tìm hiểu thêm về định hướng và nhu cầu thực tế của Nhà trường để xem hai bên có nội dung nào phù hợp để trao đổi sâu hơn. Nếu thuận tiện, em xin phép hẹn Ban Giám hiệu một buổi trao đổi online khoảng 30–40 phút. Trong buổi này Sunbot sẽ giới thiệu ngắn về chương trình và dành phần lớn thời gian để trao đổi về nhu cầu của Nhà trường.' + signature,
    message:'Em xin phép gửi Ban Giám hiệu hồ sơ giới thiệu Sunbot: ' + profileUrl + '. Sunbot mong được đồng hành cùng Nhà trường trong các hoạt động STEAM, công nghệ và phát triển tư duy cho trẻ mầm non. Nếu thuận tiện, bên em xin một buổi online khoảng 30–40 phút để giới thiệu ngắn và tìm hiểu nhu cầu của Nhà trường.'
  };
}

function journeyLogSent_(user,p) {
  required_(p,['outreach_id','scenario','channel']);
  const row = findOne_(OUTREACH.SHEET,'outreach_id',p.outreach_id);
  assertOutreachOwner_(user,row);
  const assetCode = String(p.asset_code || journeyAssetFor_(row).code);
  const channel = String(p.channel||'EMAIL').toUpperCase();
  const updateId = id_('CN');
  const label = journeyScenarioLabel_(String(p.scenario).toUpperCase());
  append_('CAP_NHAT',{
    update_id:updateId,thoi_gian:now_(),user_id:user.user_id,account_id:row.account_id||'',work_id:row.work_id||'',opp_id:'',
    loai_cap_nhat:'GUI_LOI_KET_NOI',trang_thai_truoc:String(row.trang_thai_thuc_hien||''),trang_thai_moi:'DANG_CHO_PHAN_HOI',
    ket_qua:'Đã gửi ' + label + ' qua ' + channel + '; tài liệu: ' + assetCode,
    viec_tiep_theo:'Theo dõi phản hồi và đề nghị lịch trao đổi online 30–40 phút',han:dateOutreach_(addBusinessDaysOutreach_(new Date(),3)),muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:SALES_JOURNEY.ASSETS[assetCode] ? SALES_JOURNEY.ASSETS[assetCode].url : ''
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{trang_thai_thuc_hien:'DANG_CHO_PHAN_HOI',ngay_gui:row.ngay_gui||now_(),ngay_theo_doi_lai:dateOutreach_(addBusinessDaysOutreach_(new Date(),3)),updated_at:now_()});
  audit_(user,'SEND_CONNECTION',OUTREACH.SHEET,row.outreach_id,{scenario:p.scenario,channel:channel,asset:assetCode});
  try { CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX + String(user.user_id)); } catch (ignored) {}
  return {ok:true,message:'Đã ghi nhận nội dung đã gửi và tạo mốc theo dõi sau 3 ngày làm việc.'};
}
