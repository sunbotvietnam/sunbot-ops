function ensureInitialOperationalData_(ownerUserId) {
  const existingTasks = getAll_(APP.SHEETS.TASKS);
  if (existingTasks.length) return {seeded:false, reason:'tasks_exist'};

  const today = startOfDay_(new Date());
  const plusDays = function(n){ const d = new Date(today); d.setDate(d.getDate()+n); return date_(d); };
  const now = now_();

  const tasks = [
    {
      work_id:'SEED-SUNBOT-OPS',
      ten_cong_viec:'Hoàn thiện SUNBOT OPS và kiểm thử dữ liệu E2E',
      owner_user_id:ownerUserId,
      account_id:'',
      nhom_cong_viec:'VAN_HANH',
      muc_uu_tien:'P1',
      trang_thai:'DOING',
      han_hoan_thanh:plusDays(1),
      hanh_dong_tiep:'Kiểm tra dashboard, cập nhật nhanh và dữ liệu ghi về Sheet',
      ngay_hanh_dong_tiep:plusDays(0),
      can_ceo:'FALSE',
      noi_dung_can_ceo:'',
      ngay_hoan_thanh:'',
      created_at:now,
      updated_at:now
    },
    {
      work_id:'SEED-CATALOGUE',
      ten_cong_viec:'Hoàn thiện catalogue mô hình hợp tác và ma trận cấu hình thương mại',
      owner_user_id:ownerUserId,
      account_id:'',
      nhom_cong_viec:'TAI_LIEU',
      muc_uu_tien:'P1',
      trang_thai:'DOING',
      han_hoan_thanh:plusDays(3),
      hanh_dong_tiep:'Chốt cấu hình gói, phí khởi tạo, thường niên, thiết bị, giáo viên và quyền sử dụng',
      ngay_hanh_dong_tiep:plusDays(1),
      can_ceo:'FALSE',
      noi_dung_can_ceo:'',
      ngay_hoan_thanh:'',
      created_at:now,
      updated_at:now
    },
    {
      work_id:'SEED-POLICY',
      ten_cong_viec:'Rà soát chính sách liên kết giáo dục và cơ chế thu STEAM theo tỉnh',
      owner_user_id:ownerUserId,
      account_id:'',
      nhom_cong_viec:'THI_TRUONG',
      muc_uu_tien:'P1',
      trang_thai:'DOING',
      han_hoan_thanh:plusDays(5),
      hanh_dong_tiep:'Lập danh sách văn bản mới, dự thảo và tác động đến mô hình Sunbot công lập/tư thục',
      ngay_hanh_dong_tiep:plusDays(2),
      can_ceo:'FALSE',
      noi_dung_can_ceo:'',
      ngay_hoan_thanh:'',
      created_at:now,
      updated_at:now
    },
    {
      work_id:'SEED-TEAM',
      ten_cong_viec:'Chốt cơ chế vai trò, KPI và phối hợp Nhung – Thu – Dung',
      owner_user_id:ownerUserId,
      account_id:'',
      nhom_cong_viec:'VAN_HANH',
      muc_uu_tien:'P1',
      trang_thai:'OPEN',
      han_hoan_thanh:plusDays(7),
      hanh_dong_tiep:'Chốt đầu việc, KPI, cơ chế báo cáo và trách nhiệm theo địa bàn',
      ngay_hanh_dong_tiep:plusDays(3),
      can_ceo:'FALSE',
      noi_dung_can_ceo:'',
      ngay_hoan_thanh:'',
      created_at:now,
      updated_at:now
    },
    {
      work_id:'SEED-CASH',
      ten_cong_viec:'Rà soát công nợ, hoa hồng và dòng tiền giai đoạn 1–7/2026',
      owner_user_id:ownerUserId,
      account_id:'',
      nhom_cong_viec:'CONG_NO',
      muc_uu_tien:'P1',
      trang_thai:'OPEN',
      han_hoan_thanh:plusDays(7),
      hanh_dong_tiep:'Đối chiếu khoản phải thu, hoa hồng hiệu trưởng/đối tác và kế hoạch chi trả',
      ngay_hanh_dong_tiep:plusDays(3),
      can_ceo:'FALSE',
      noi_dung_can_ceo:'',
      ngay_hoan_thanh:'',
      created_at:now,
      updated_at:now
    }
  ];

  tasks.forEach(function(t){ append_(APP.SHEETS.TASKS, t); });

  const signals = [
    {
      feed_id:'SEED-AI-POLICY', timestamp:now, user_id:ownerUserId,
      nhom_tin_hieu:'MARKET', doi_tuong:'Chính sách giáo dục liên kết',
      tin_hieu:'Cần ưu tiên theo dõi cơ chế thu STEAM và quy định liên kết theo từng địa phương trước năm học mới.',
      muc_do:'HIGH', ceo_action:'Dùng kết quả rà soát để quyết định trọng tâm công lập tỉnh và khối tư.',
      deadline:plusDays(5), source_type:'SEED', source_id:'SEED-POLICY'
    },
    {
      feed_id:'SEED-AI-CASH', timestamp:now, user_id:ownerUserId,
      nhom_tin_hieu:'CASH', doi_tuong:'Dòng tiền Kiro/Sunbot',
      tin_hieu:'Cần hoàn tất đối chiếu công nợ và nghĩa vụ hoa hồng trước khi bước vào chu kỳ năm học mới.',
      muc_do:'HIGH', ceo_action:'Chốt bảng công nợ và thứ tự ưu tiên chi trả.',
      deadline:plusDays(7), source_type:'SEED', source_id:'SEED-CASH'
    },
    {
      feed_id:'SEED-AI-EXEC', timestamp:now, user_id:ownerUserId,
      nhom_tin_hieu:'EXECUTION', doi_tuong:'SUNBOT OPS',
      tin_hieu:'Hệ thống đã vào production; bước tiếp theo là kiểm thử dữ liệu thật và phân quyền nhân sự.',
      muc_do:'MEDIUM', ceo_action:'Hoàn tất E2E rồi mới mở cho đội ngũ sử dụng.',
      deadline:plusDays(1), source_type:'SEED', source_id:'SEED-SUNBOT-OPS'
    }
  ];
  signals.forEach(function(x){ append_(APP.SHEETS.AI_FEED, x); });

  append_(APP.SHEETS.AUDIT, {
    audit_id:'AUD-SEED-' + Utilities.getUuid(),
    timestamp:now,
    user_id:ownerUserId,
    action:'SEED_INITIAL_DATA',
    entity_type:'SYSTEM',
    entity_id:'SUNBOT_OPS',
    detail_json:JSON.stringify({tasks:tasks.length,signals:signals.length})
  });

  return {seeded:true, tasks:tasks.length, signals:signals.length};
}
