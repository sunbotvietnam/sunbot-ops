// SUNBOT School OS V2 — Active Work view for Sale
// Principle: Sale manages active work; School OS keeps the full database.
(function(){
  const TERMINAL_OPP={WON:true,LOST:true,CLOSED:true,CANCELLED:true,CANCELED:true};

  function activeOpportunityMap_(){
    const map={};
    v2Rows_(V2_OS.S.OPPS).forEach(function(r){
      const status=String(r.status||'').toUpperCase();
      const stage=String(r.stage||'').toUpperCase();
      if(TERMINAL_OPP[status]||TERMINAL_OPP[stage])return;
      const schoolId=String(r.school_id||'');if(!schoolId)return;
      const current=map[schoolId];
      if(!current||String(r.updated_at||r.created_at||'')>String(current.updated_at||current.created_at||''))map[schoolId]=r;
    });
    return map;
  }

  function activeWorkList_(u,payload){
    payload=payload||{};
    const users=v2UserMap_(),actions=v2CurrentActionMap_(),opps=activeOpportunityMap_();
    const includeNoAction=String(payload.include_no_action||'')==='1'||payload.include_no_action===true;
    return v2Rows_(V2_OS.S.SCHOOLS)
      .filter(function(r){
        if(!v2Truthy_(r.active)||!v2CanSeeSchool_(u,r))return false;
        const hasAction=!!actions[r.school_id],hasOpp=!!opps[r.school_id];
        return hasAction||hasOpp||(includeNoAction&&['ENGAGED','DISCOVERY','OPPORTUNITY','CUSTOMER'].indexOf(String(r.relationship_state||'').toUpperCase())>=0);
      })
      .map(function(r){
        const view=v2SchoolView_(r,actions[r.school_id],users),opp=opps[r.school_id]||null;
        view.active_reason=actions[r.school_id]?'NEXT_ACTION':opp?'OPEN_OPPORTUNITY':'RELATIONSHIP_REVIEW';
        view.opportunity_id=opp?String(opp.opportunity_id||''):'';
        view.opportunity_stage=opp?String(opp.stage||''):'';
        view.opportunity_status=opp?String(opp.status||''):'';
        return view;
      })
      .sort(function(a,b){
        if(a.overdue!==b.overdue)return a.overdue?-1:1;
        if(!!a.next_action_date!==!!b.next_action_date)return a.next_action_date?-1:1;
        return String(a.next_action_date||'9999-12-31').localeCompare(String(b.next_action_date||'9999-12-31'))||String(a.school_name||'').localeCompare(String(b.school_name||''),'vi');
      });
  }

  function activeToday_(u){
    const today=v2DateOnly_(new Date());
    return activeWorkList_(u,{}).filter(function(s){return s.overdue||String(s.next_action_date||'')===today;});
  }

  this.apiSessionV2Active=function(sessionToken,action,payload){
    const u=v2RequireSession_(sessionToken),a=String(action||'');
    if(a==='worklist')return activeWorkList_(u,payload||{});
    if(a==='today')return activeToday_(u);
    if(a==='summary'){
      const rows=activeWorkList_(u,{}),today=v2DateOnly_(new Date());
      return {active:rows.length,overdue:rows.filter(function(x){return x.overdue;}).length,today:rows.filter(function(x){return String(x.next_action_date||'')===today;}).length,waiting_admin:0};
    }
    throw new Error('Tác vụ Active Work không hợp lệ.');
  };
}).call(this);
