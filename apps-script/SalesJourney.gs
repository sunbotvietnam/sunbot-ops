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
  return ({NEW:'Kết nối lần đầu',KNOWN:'Kết nối lại',FORMER:'Tái kết nối',CURRENT:'Trao đổi năm học mới'})[s] || 'Kết nối lần đầu';
}

function journeyAssetFor_(row, requested) {
  if (requested && SALES_JOURNEY.ASSETS[String(requested)]) return SALES_JOURNEY.ASSETS[String(requested)];
  const type = String(row.loai_hinh || row.loai_doi_tuong || '').toLowerCase();
  return /tư|private|hệ thống/.test(type) ? SALES_JOURNEY.ASSETS.PROFILE_PRIVATE : SALES_JOURNEY.ASSETS.PROFILE_PUBLIC;
}

function journeyPersonalLine_(row) {
  const raw = String(row.thong_diep_de_xuat || '').replace(/\s+/g,' ').trim();
  if (!raw) return '';
  const clean = raw.length > 260 ? raw.slice(0,257) + '…' : raw;
  return '\n\nQua những thông tin bên em tìm hiểu được về Nhà trường, em thấy có một số điểm khá đáng để hai bên trao đổi thêm: ' + clean;
}

function journeyTemplate_(user,scenario,row,profileUrl) {
  const school = String(row.ten_truong || 'Nhà trường').trim();
  const sender = String(user.ho_ten || 'bên em').trim();
  const signature = '\n\nTrân trọng,\n' + sender + '\nSunbot – Kiro Việt Nam\n' + (user.email ? 'Email: ' + user.email : '');
  const profileLine = '\n\nEm gửi cô/thầy hồ sơ giới thiệu của Sunbot để tiện tham khảo trước:\n' + profileUrl;
  const personal = journeyPersonalLine_(row);
  const cta = '\n\nNếu cô/thầy thấy phù hợp, em rất mong có thể xin một buổi trao đổi online khoảng 30–40 phút. Bên em sẽ giới thiệu rất ngắn phần cần thiết, còn phần lớn thời gian muốn dành để nghe thêm về mục tiêu, điều kiện và những điều Nhà trường đang thực sự cần. Sau đó Sunbot mới cùng Nhà trường xem có hướng nào phù hợp để đi tiếp hay không.';

  if (scenario === 'CURRENT') return {
    subject:'Trao đổi cùng ' + school + ' về kế hoạch Sunbot năm học mới',
    body:'Kính gửi cô/thầy Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ' bên Sunbot. Nhân dịp Nhà trường đang chuẩn bị cho năm học mới, em xin phép liên hệ để cùng cô/thầy rà soát lại việc triển khai Sunbot tại trường và trao đổi về kế hoạch sắp tới.\n\nSau một năm triển khai, bên em nghĩ điều quan trọng không chỉ là “có tiếp tục hay không”, mà là phần nào đang thực sự có giá trị với trẻ và giáo viên, phần nào còn bất tiện trong vận hành, và năm học mới Nhà trường muốn thay đổi điều gì. Sunbot muốn nghe những điều đó trước khi nói đến phương án.' + personal + profileLine + cta + signature,
    message:'Em xin phép gửi cô/thầy hồ sơ Sunbot cập nhật cho năm học mới: ' + profileUrl + '. Bên em muốn xin một buổi online khoảng 30–40 phút để cùng nhìn lại phần nào đang hiệu quả, phần nào còn vướng và nhu cầu mới của Nhà trường trước khi bàn phương án tiếp theo.'
  };

  if (scenario === 'FORMER') return {
    subject:'Sunbot xin phép kết nối lại với ' + school,
    body:'Kính gửi cô/thầy Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ' bên Sunbot. Trước đây Nhà trường đã từng triển khai Sunbot, vì vậy em xin phép liên hệ lại để hỏi thăm tình hình và cập nhật với cô/thầy về những thay đổi của bên em trong năm học mới.\n\nBên em hiểu rằng một chương trình dừng lại thường không chỉ vì nội dung chuyên môn; nhiều khi còn liên quan đến nhân sự, cách vận hành, chi phí, thời điểm hoặc cơ chế của Nhà trường. Vì vậy Sunbot không muốn mặc định quay lại mô hình cũ, mà muốn nghe lại thật kỹ xem trước đây điều gì chưa thuận lợi và hiện nay nhu cầu của trường đã thay đổi ra sao.' + personal + profileLine + cta + signature,
    message:'Em xin phép gửi lại cô/thầy hồ sơ Sunbot cập nhật: ' + profileUrl + '. Vì Nhà trường đã từng triển khai, bên em muốn ưu tiên nghe lại những điểm chưa thuận lợi trước đây và nhu cầu hiện tại trong một buổi online khoảng 30–40 phút, rồi mới tính đến phương án.'
  };

  if (scenario === 'KNOWN') return {
    subject:'Xin phép kết nối lại với ' + school + ' về Sunbot',
    body:'Kính gửi cô/thầy Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ' bên Sunbot. Trước đây Sunbot đã từng có dịp trao đổi với Nhà trường, tuy nhiên khi đó hai bên chưa có điều kiện triển khai. Em xin phép kết nối lại để cập nhật với cô/thầy về một số thay đổi trong năm học mới.\n\nThực tế một phương án từng chưa phù hợp có thể do thời điểm, nhân sự, cách tổ chức lớp, mức đầu tư hoặc đơn giản là chưa đúng nhu cầu lúc đó. Vì vậy bên em không muốn tiếp tục từ một đề xuất cũ, mà muốn hiểu lại xem hiện nay Nhà trường đang ưu tiên điều gì và đâu mới là khoảng trống Sunbot có thể hỗ trợ.' + personal + profileLine + cta + signature,
    message:'Em xin phép gửi cô/thầy hồ sơ Sunbot cập nhật: ' + profileUrl + '. So với lần trao đổi trước, bên em muốn bắt đầu lại từ nhu cầu hiện tại của Nhà trường. Nếu thuận tiện, em xin khoảng 30–40 phút trao đổi online để cùng xem hiện nay đâu là vấn đề đáng ưu tiên nhất.'
  };

  return {
    subject:'Xin phép gửi cô/thầy một số thông tin về chương trình Sunbot',
    body:'Kính gửi cô/thầy Ban Giám hiệu ' + school + ',\n\nEm là ' + sender + ', phụ trách kết nối các trường mầm non của Sunbot – Kiro Việt Nam. Em xin phép gửi cô/thầy một số thông tin ngắn để Nhà trường tham khảo.\n\nSunbot hiện tập trung vào các hoạt động lập trình tư duy, robotics và STEAM dành cho trẻ mầm non, đi cùng chương trình và hỗ trợ giáo viên trong quá trình triển khai. Bên em hiểu rằng với một trường mầm non, thêm một chương trình mới không chỉ là chọn nội dung hay thiết bị; Nhà trường còn phải cân nhắc giáo viên có làm chủ được không, lịch học có phù hợp không, mức đầu tư có hợp lý không và phụ huynh có nhìn thấy giá trị của chương trình hay không. Vì vậy Sunbot muốn bắt đầu bằng việc hiểu điều kiện thật của trường trước.' + personal + profileLine + cta + signature,
    message:'Em xin phép gửi cô/thầy hồ sơ giới thiệu ngắn về Sunbot: ' + profileUrl + '. Bên em hiểu rằng thêm một chương trình mới còn liên quan đến giáo viên, lịch học, đầu tư và giá trị phụ huynh nhìn thấy. Nếu cô/thầy thấy phù hợp, em xin khoảng 30–40 phút trao đổi online để hiểu nhu cầu thực tế trước khi đề xuất bất kỳ phương án nào.'
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
  return {ok:true,message:'Đã ghi nhận lời kết nối và tạo mốc theo dõi sau 3 ngày làm việc.'};
}
