const SCHOOL_MODEL_2026_V33 = Object.freeze({
  VERSION: '2026.09.15-v33',
  OWNERSHIP: ['PUBLIC','PRIVATE','PRIVATE_SYSTEM','OTHER'],
  STRUCTURE: ['SINGLE_SITE','MULTI_CAMPUS','MULTI_SCHOOL_GROUP','CLUSTER'],
  MERGER: ['INDEPENDENT','POST_MERGER','PENDING_VERIFY'],
  DELIVERY: ['DIRECT','CO_DELIVERY','SCHOOL_LED','SYSTEM_MULTI_SITE'],
  TEACHER_SOURCE: ['SUNBOT','SCHOOL','LOCAL','MIXED','UNKNOWN'],
  PAYER: ['PARENT','SCHOOL','PUBLIC_BUDGET','SPONSOR','MIXED','UNKNOWN'],
  APPROVAL: ['CLEAR','NEED_REVIEW','NEED_APPROVAL','PILOT','UNKNOWN']
});

function schoolModel2026Info_(){
  return {
    version: SCHOOL_MODEL_2026_V33.VERSION,
    principle: 'MULTI_CAMPUS is not MULTI_SCHOOL_GROUP',
    message: 'Sunbot là hệ thống giáo dục công nghệ dành cho trẻ mầm non. Robot là học cụ; trọng tâm là trẻ, giáo viên và quá trình học.'
  };
}
