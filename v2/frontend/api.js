export const API={
  baseUrl:'',
  token:sessionStorage.getItem('sunbot_v2_token')||'',
  setBaseUrl(url){this.baseUrl=String(url||'').trim();},
  setToken(token){this.token=token||'';if(token)sessionStorage.setItem('sunbot_v2_token',token);else sessionStorage.removeItem('sunbot_v2_token');},
  async request(action,payload={}){
    if(!this.baseUrl) throw new Error('V2 API chưa được cấu hình.');
    const body=new URLSearchParams({action,token:this.token,payload:JSON.stringify(payload||{})});
    const res=await fetch(this.baseUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||'Không thể xử lý yêu cầu.');
    return data.result;
  },
  login(loginId,password){return this.request('auth.login',{login_id:loginId,password});},
  bootstrap(){return this.request('app.bootstrap');},
  today(){return this.request('today.list');},
  schools(filters={}){return this.request('schools.list',filters);},
  schoolDetail(schoolId){return this.request('schools.detail',{school_id:schoolId});},
  createInteraction(payload){return this.request('interactions.create',payload);},
  createNextAction(payload){return this.request('next_actions.create',payload);},
  completeNextAction(actionId){return this.request('next_actions.complete',{action_id:actionId});}
};
