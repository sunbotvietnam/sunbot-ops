const CEO_INTELLIGENCE = Object.freeze({
  PEOPLE: 'NHAN_SU',
  TASKS: 'CONG_VIEC',
  UPDATES: 'CAP_NHAT',
  OPPORTUNITIES: 'CO_HOI',
  RECEIVABLES: 'CONG_NO',
  ISSUES: 'VAN_DE',
  SIGNALS: 'THI_TRUONG_TIN_HIEU',
  COMPETITORS: 'DOI_THU',
  OFFERS: 'CHAO_BAN_THI_TRUONG'
});

/** Read-only CEO API. Keeps CEO aggregation separate from employee CRUD APIs. */
function apiSessionCeo(sessionToken, action, payload) {
  const user = authenticateSession_(sessionToken);
  if (!user.permissions['ceo.view']) throw new Error('Bạn không có quyền xem CEO Cockpit.');
  ensureCommercialRuntimeSchema_();
  payload = payload || {};
  switch (action) {
    case 'cockpit': return ceoCockpit_(user, payload);
    case 'weekly': return ceoWeeklyIntelligence_(user, payload);
    default: throw new Error('Tác vụ CEO Intelligence không hợp lệ.');
  }
}

function ceoCockpit_(user, p) {
  const days = Math.max(7, Math.min(90, Number(p.days || 7)));
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - days + 1); start.setHours(0,0,0,0);
  const today = startOfDay_(now);
  const seven = new Date(today); seven.setDate(seven.getDate() + 7);

  const people = getAll_(CEO_INTELLIGENCE.PEOPLE).filter(r => isActiveStatus_(r.trang_thai));
  const team = people.map(person => {
    const kpi = commercialKpi_(user, {user_id:String(person.user_id), days:days});
    return {
      user_id:String(person.user_id),
      ho_ten:person.ho_ten,
      dia_ban:person.dia_ban || '',
      coverage:kpi.schoolCoverage,
      followup:kpi.followup,
      workEvidence:kpi.workEvidence,
      pipeline:kpi.pipeline,
      intelligence:kpi.intelligence
    };
  });

  const opps = getAll_(CEO_INTELLIGENCE.OPPORTUNITIES);
  const activeOpps = opps.filter(r => !['LOST','HOLD'].includes(String(r.trang_thai)));
  const weightedPipeline = activeOpps.reduce((s,r)=>s+Number(r.gia_tri_du_kien||0)*(Number(r.xac_suat||0)/100),0);
  const rawPipeline = activeOpps.reduce((s,r)=>s+Number(r.gia_tri_du_kien||0),0);
  const byStage = {};
  opps.forEach(r => { const k=String(r.trang_thai||'UNKNOWN'); byStage[k]=(byStage[k]||0)+1; });
  const topOpportunities = activeOpps.slice().sort((a,b)=>Number(b.gia_tri_du_kien||0)-Number(a.gia_tri_du_kien||0)).slice(0,8).map(r=>({
    opp_id:r.opp_id, account_id:r.account_id, account:accountName_(r.account_id), name:r.ten_co_hoi,
    product:r.san_pham, stage:r.trang_thai, value:Number(r.gia_tri_du_kien||0), probability:Number(r.xac_suat||0),
    expected_cash_date:date_(r.expected_cash_date), owner:userName_(r.owner_user_id)
  }));

  const tasks = getAll_(CEO_INTELLIGENCE.TASKS).filter(r => !['DONE','CANCELLED'].includes(String(r.trang_thai)));
  const overdue = tasks.filter(r => { const d=parseDate_(r.han_hoan_thanh||r.ngay_hanh_dong_tiep); return d&&d<today; });
  const ceoTasks = tasks.filter(r => bool_(r.can_ceo));

  const receivables = getAll_(CEO_INTELLIGENCE.RECEIVABLES).filter(r=>String(r.trang_thai)!=='PAID');
  const outstanding = receivables.reduce((s,r)=>s+Number(r.so_tien||0),0);
  const cash7 = receivables.reduce((s,r)=>{const d=parseDate_(r.ngay_du_kien_ve);return d&&d>=today&&d<=seven?s+Number(r.so_tien||0):s;},0);

  const signals = getAll_(CEO_INTELLIGENCE.SIGNALS);
  const periodSignals = signals.filter(r=>between_(r.captured_at,start,now));
  const accepted = signals.filter(r=>String(r.review_status)==='DU_CAN_CU' && between_(r.reviewed_at||r.captured_at,start,now));
  const pendingReview = signals.filter(r=>String(r.review_status)==='CHUA_REVIEW');
  const acceptedFacts = accepted.slice().reverse().slice(0,10).map(r=>({
    signal_id:r.signal_id, fact:r.verified_fact, confidence:r.confidence, source_type:r.source_type,
    subject:competitorName_(r.competitor_id)||accountName_(r.account_id)||'Thị trường', reviewed_at:r.reviewed_at
  }));

  const changes = getAll_(CEO_INTELLIGENCE.UPDATES).filter(r=>between_(r.thoi_gian,start,now) && String(r.trang_thai_truoc||'')!==String(r.trang_thai_moi||'') && r.trang_thai_moi).slice().reverse().slice(0,12).map(r=>({
    update_id:r.update_id, account:accountName_(r.account_id), result:r.ket_qua, from:r.trang_thai_truoc, to:r.trang_thai_moi,
    owner:userName_(r.user_id), at:r.thoi_gian, opp_id:r.opp_id||''
  }));

  const issues = getAll_(CEO_INTELLIGENCE.ISSUES).filter(r=>String(r.trang_thai)!=='RESOLVED' && bool_(r.can_ceo)).slice(0,12).map(r=>({
    issue_id:r.issue_id, description:r.mo_ta, ask:r.de_nghi_ceo, owner:userName_(r.owner_user_id), due:date_(r.han_xu_ly), severity:r.muc_do
  }));

  const competitors = getAll_(CEO_INTELLIGENCE.COMPETITORS);
  const offers = getAll_(CEO_INTELLIGENCE.OFFERS);

  return {
    generated_at:now_(), period:{days:days,from:date_(start),to:date_(now)},
    summary:{
      active_opportunities:activeOpps.length, raw_pipeline:rawPipeline, weighted_pipeline:weightedPipeline,
      overdue_tasks:overdue.length, ceo_tasks:ceoTasks.length, outstanding_receivables:outstanding, cash_expected_7d:cash7,
      market_signals:periodSignals.length, accepted_market_facts:accepted.length, pending_market_review:pendingReview.length,
      competitors:competitors.length, p1_competitors:competitors.filter(r=>String(r.radar_priority)==='P1').length, market_offers:offers.length
    },
    pipeline:{by_stage:byStage, top:topOpportunities, changes:changes},
    market:{facts:acceptedFacts,pending_review:pendingReview.slice().reverse().slice(0,10).map(r=>({signal_id:r.signal_id,raw_signal:r.raw_signal,source_type:r.source_type,owner:userName_(r.user_id),captured_at:r.captured_at}))},
    decisions:issues,
    team:team
  };
}

function ceoWeeklyIntelligence_(user, p) {
  const days = Math.max(7, Math.min(31, Number(p.days || 7)));
  const cockpit = ceoCockpit_(user,{days:days});
  const riskPeople = cockpit.team.filter(x=>x.followup.overdue>0 || x.workEvidence.validRate<80 || x.coverage.rate<50).sort((a,b)=>b.followup.overdue-a.followup.overdue);
  const strongPeople = cockpit.team.filter(x=>x.workEvidence.validRate>=80 && x.followup.onTimeRate>=80).sort((a,b)=>b.pipeline.expectedCash-a.pipeline.expectedCash);
  return {
    generated_at:cockpit.generated_at,
    period:cockpit.period,
    executive_summary:{
      pipeline:`${cockpit.summary.active_opportunities} cơ hội đang hoạt động; weighted pipeline ${Math.round(cockpit.summary.weighted_pipeline)} VND.`,
      execution:`${cockpit.summary.overdue_tasks} việc quá hạn; ${cockpit.summary.ceo_tasks} việc đang cần CEO.`,
      cash:`Công nợ mở ${Math.round(cockpit.summary.outstanding_receivables)} VND; dự kiến 7 ngày ${Math.round(cockpit.summary.cash_expected_7d)} VND.`,
      market:`${cockpit.summary.accepted_market_facts} market fact được xác minh trong kỳ; ${cockpit.summary.pending_market_review} tín hiệu đang chờ review.`
    },
    pipeline_changes:cockpit.pipeline.changes,
    market_facts:cockpit.market.facts,
    decisions_needed:cockpit.decisions,
    team_attention:riskPeople.slice(0,8),
    team_positive:strongPeople.slice(0,8),
    top_opportunities:cockpit.pipeline.top
  };
}
