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
  const tpl = journeyTemplate_(scenario,row,asset.url);
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

function journeyTemplate_(scenario,row,profileUrl) {
  const school = String(row.ten_truong || 'Nhà trường').trim();
  const profileLine = '\n\nHồ sơ số Sunbot: ' + profileUrl;
  const cta = '\n\nNếu phù hợp, Sunbot mong được sắp xếp một buổi trao đổi online khoảng 30–40 phút để giới thiệu rất ngắn về cách Sunbot đang triển khai hiện nay, đồng thời tìm hiểu kỹ hơn mục tiêu và điều kiện thực tế của ' + school + '. Sau buổi trao đổi, Sunbot mới đề xuất phương án phù hợp; việc trao đổi ban đầu không tạo ra cam kết triển khai hay nghĩa vụ tài chính.';
  if (scenario === 'CURRENT') return {
    subject:'Trao đổi kế hoạch Sunbot năm học 2026–2027 – ' + school,
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nCảm ơn Nhà trường đã đồng hành cùng Sunbot trong năm học vừa qua. Bước vào năm học 2026–2027, Sunbot đã điều chỉnh và hoàn thiện thêm chương trình, cơ chế đào tạo giáo viên, vận hành và đánh giá để có thể linh hoạt hơn theo điều kiện của từng trường.' + profileLine + cta + '\n\nTrân trọng,\nSunbot – Kiro Việt Nam',
    message:'Sunbot xin gửi Nhà trường hồ sơ cập nhật cho năm học 2026–2027: ' + profileUrl + '. Sunbot mong có một buổi trao đổi online khoảng 30–40 phút để cùng rà lại kết quả năm vừa rồi, nhu cầu năm học mới và phương án phù hợp.'
  };
  if (scenario === 'FORMER') return {
    subject:'Mời trao đổi lại về Sunbot – ' + school,
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nSunbot trân trọng mối quan hệ đã có với Nhà trường trong giai đoạn trước. Thay vì mặc định đề nghị khôi phục mô hình cũ, Sunbot mong được hiểu rõ hơn những điểm từng chưa phù hợp và những thay đổi hiện nay của Nhà trường để xem có một cách hợp tác khác hợp lý hơn hay không.' + profileLine + cta + '\n\nTrân trọng,\nSunbot – Kiro Việt Nam',
    message:'Sunbot xin phép gửi lại hồ sơ cập nhật: ' + profileUrl + '. Vì Nhà trường đã từng triển khai Sunbot, bên em muốn ưu tiên nghe lại những điểm chưa phù hợp trước đây và trao đổi khoảng 30–40 phút trước khi đề xuất bất kỳ phương án mới nào.'
  };
  if (scenario === 'KNOWN') return {
    subject:'Mời trao đổi lại về phương án Sunbot – ' + school,
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nTrước đây Sunbot đã có dịp được Nhà trường biết tới hoặc trao đổi bước đầu. Trong năm học 2026–2027, Sunbot đã điều chỉnh khá nhiều về cách triển khai: không chỉ cung cấp robot/chương trình mà tổ chức đồng bộ chương trình, đào tạo giáo viên, vận hành, quan sát–đánh giá và nhiều cấu hình hợp tác khác nhau.' + profileLine + cta + '\n\nTrân trọng,\nSunbot – Kiro Việt Nam',
    message:'Sunbot xin gửi Nhà trường hồ sơ cập nhật: ' + profileUrl + '. So với giai đoạn trước, mô hình triển khai hiện đã linh hoạt hơn. Bên em mong xin một buổi online khoảng 30–40 phút để hiểu lại nhu cầu hiện tại rồi mới đề xuất phương án.'
  };
  return {
    subject:'Kết nối trao đổi về giáo dục công nghệ mầm non Sunbot – ' + school,
    body:'Kính gửi Ban Giám hiệu ' + school + ',\n\nSunbot là hệ sinh thái giáo dục công nghệ dành cho trẻ mầm non, với hai phân môn chính là “Lập trình tư duy cùng Sunbot” và “STEAM Sáng tạo cùng Sunbot”, kết hợp chương trình, robot/học liệu, đào tạo giáo viên, vận hành và quan sát–đánh giá. Sunbot đã được triển khai tại 300+ cơ sở giáo dục và tiếp cận 50.000+ trẻ em trước năm 2026.' + profileLine + cta + '\n\nTrân trọng,\nSunbot – Kiro Việt Nam',
    message:'Sunbot xin phép gửi Nhà trường hồ sơ giới thiệu ngắn: ' + profileUrl + '. Nếu Nhà trường thấy có điểm phù hợp, bên em mong xin một buổi trao đổi online khoảng 30–40 phút để hiểu nhu cầu thực tế trước khi đề xuất phương án.'
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
    viec_tiep_theo:'Theo dõi phản hồi và đề nghị lịch trao đổi 30–40 phút',han:dateOutreach_(addBusinessDaysOutreach_(new Date(),3)),muc_do:'BINH_THUONG',can_ceo:'FALSE',noi_dung_can_ceo:'',bang_chung_url:SALES_JOURNEY.ASSETS[assetCode] ? SALES_JOURNEY.ASSETS[assetCode].url : ''
  });
  updateById_(OUTREACH.SHEET,'outreach_id',row.outreach_id,{trang_thai_thuc_hien:'DANG_CHO_PHAN_HOI',ngay_gui:row.ngay_gui||now_(),ngay_theo_doi_lai:dateOutreach_(addBusinessDaysOutreach_(new Date(),3)),updated_at:now_()});
  audit_(user,'SEND_CONNECTION',OUTREACH.SHEET,row.outreach_id,{scenario:p.scenario,channel:channel,asset:assetCode});
  try { CacheService.getScriptCache().remove(FAST_API.KEY_PREFIX + String(user.user_id)); } catch (ignored) {}
  return {ok:true,message:'Đã ghi nhận lời kết nối và tạo mốc theo dõi sau 3 ngày làm việc.'};
}
