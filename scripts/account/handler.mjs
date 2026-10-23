// Server-only Supabase email sign-in adapter. Never included in the static manifest; no service-role key.
import crypto from 'node:crypto';
const TASK_STATES=['planned','in-progress','waiting-for-evidence','ready-for-human-review','completed','blocked'];
export function validateWorkspace(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>45000)throw Error('invalid');
  const string=(v,max=2000)=>{if(typeof v!=='string'||v.length>max)throw Error('invalid');return v;};
  const profile={name:string(value.profile?.name,120),organization:string(value.profile?.organization,160)};
  if(!Array.isArray(value.prospects)||value.prospects.length>30)throw Error('invalid');
  const prospects=value.prospects.map(p=>{
    const item={};for(const key of ['id','company','status','product','opportunity','contact','notes','nextSteps','requirements','evidence','deliverables','reports'])item[key]=string(p[key]??'',key==='id'?80:2000);
    if(!['prospect','pilot','customer'].includes(item.status))throw Error('invalid');
    if(!Array.isArray(p.tasks)||p.tasks.length>40)throw Error('invalid');
    item.tasks=p.tasks.map(t=>{if(!TASK_STATES.includes(t.status))throw Error('invalid');return{id:string(t.id,80),title:string(t.title,240),agent:string(t.agent,80),status:t.status};});
    item.project={id:typeof p.project?.id==='string'&&/^[a-z0-9-]{1,40}$/.test(p.project.id)?p.project.id:'private-project',mode:p.project?.mode==='future'?'future':p.project?.mode==='past'?'past':'present',parameters:{}};
    for(const [key,max]of Object.entries({hvac:35,envelope:50,solar:600,battery:1000})){const n=p.project?.parameters?.[key]??0;if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max)throw Error('invalid');item.project.parameters[key]=n;}
    return item;
  });
  const activity=Array.isArray(value.activity)?value.activity.slice(-30).filter(a=>a&&typeof a.at==='string'&&a.kind==='workspace-saved').map(a=>({at:string(a.at,40),kind:a.kind})):[];
  return{profile,prospects,activity};
}
export function createAccountHandler({env=process.env,fetcher=fetch}={}) {
  const url=env.CORE_SUPABASE_URL,key=env.CORE_SUPABASE_PUBLISHABLE_KEY,owner=env.CORE_FOUNDER_USER_ID,email=env.CORE_FOUNDER_EMAIL,origin=env.CORE_ACCOUNT_ORIGIN;
  const configured=!!(url&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)&&/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key||'')&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(owner||'')&&email&&origin&&/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin));
  const cookieName='__Host-core_account',pkceName='__Host-core_pkce';
  const cookie=(token='',age=0,name=cookieName)=>`${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
  async function upstream(path,{token,method='GET',body,headers={}}={}){
    const r=await fetcher(url+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const data=await r.json().catch(()=>null);if(!r.ok){const e=Error('provider');e.status=r.status;throw e;}return data;
  }
  return async function account(req,res) {
    const send=(status,data,extra={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra});res.end(JSON.stringify(data));};
    const path=new URL(req.url,'https://core.invalid').pathname.replace(/^\/api\/account/,'');
    if(!['/login','/verify','/callback','/logout','/session','/workspace'].includes(path))return send(404,{error:'unknown-operation'});
    if(!configured)return send(503,{error:'account-not-configured'});
    if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'origin-refused'});
    if(!['GET','POST','PATCH'].includes(req.method))return send(405,{error:'method-refused'});
    if(req.method!=='GET'&&(req.headers.origin!==origin||req.headers['content-type']!=='application/json'))return send(403,{error:'origin-refused'});
    let body={};
    if(req.method!=='GET')try{let size=0,chunks=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>48000)return send(413,{error:'request-too-large'});chunks.push(chunk);}body=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(400,{error:'invalid-input'});}
    const readCookie=name=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
    const token=readCookie(cookieName);
    try {
      if(path==='/login'&&req.method==='POST'){
        // Do not reveal whether an address exists; only the configured founder receives a provider request.
        // PKCE binds the emailed link to this browser: the verifier stays in an HttpOnly cookie, the link returns only a one-time code.
        const verifier=crypto.randomBytes(48).toString('base64url'),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
        if(typeof body.email==='string'&&body.email.toLowerCase()===email.toLowerCase())await upstream('/auth/v1/otp?redirect_to='+encodeURIComponent(origin+'/me.html'),{method:'POST',body:{email,create_user:false,code_challenge:challenge,code_challenge_method:'s256'}});
        return send(200,{sent:true},{'Set-Cookie':cookie(verifier,900,pkceName)});
      }
      if((path==='/verify'||path==='/callback')&&req.method==='POST'){
        let verification;
        if(path==='/callback'&&body.type==='pkce'){
          const verifier=readCookie(pkceName);
          if(typeof body.code!=='string'||!/^[A-Za-z0-9-]{8,128}$/.test(body.code)||!/^[A-Za-z0-9_-]{43,128}$/.test(verifier||''))return send(400,{error:'invalid-invitation'},{'Set-Cookie':cookie('',0,pkceName)});
          verification={pkce:{auth_code:body.code,code_verifier:verifier}};
        }else if(path==='/callback'){
          if(!['invite','email'].includes(body.type)||typeof body.token_hash!=='string'||!/^[A-Za-z0-9_-]{32,256}$/.test(body.token_hash))return send(400,{error:'invalid-invitation'});
          verification={token_hash:body.token_hash,type:body.type};
        }else{
          if(typeof body.code!=='string'||!/^\d{6,10}$/.test(body.code)||body.email?.toLowerCase()!==email.toLowerCase())return send(401,{error:'sign-in-failed'});
          verification={email,token:body.code,type:'email'};
        }
        let session;
        // An expired, reused or foreign link is a refused sign-in, not a provider outage.
        try{session=verification.pkce?await upstream('/auth/v1/token?grant_type=pkce',{method:'POST',body:verification.pkce}):await upstream('/auth/v1/verify',{method:'POST',body:verification});}
        catch(e){if(e.status>=400&&e.status<500)return send(401,{error:path==='/callback'?'invalid-invitation':'sign-in-failed'},path==='/callback'?{'Set-Cookie':cookie('',0,pkceName)}:{});throw e;}
        if(typeof session.access_token!=='string'||!/^[A-Za-z0-9_.-]+$/.test(session.access_token))return send(401,{error:'sign-in-failed'});
        // Authenticated provider identity, never the submitted email or untrusted user metadata.
        const user=await upstream('/auth/v1/user',{token:session.access_token});
        if(user?.id!==owner)return send(403,{error:'founder-only'});
        const members=await upstream('/rest/v1/core_founders?select=user_id&user_id=eq.'+owner,{token:session.access_token});
        if(!Array.isArray(members)||members.length!==1||members[0].user_id!==owner)return send(403,{error:'founder-only'});
        const age=Math.min(3600,Math.floor(Number(session.expires_in)||0));if(age<=0)return send(401,{error:'session-expired'});
        return send(200,{authenticated:true,expiresAt:Date.now()+age*1000},{'Set-Cookie':[cookie(session.access_token,age),cookie('',0,pkceName)]});
      }
      if(path==='/logout'&&req.method==='POST'){
        if(token){
          await upstream('/auth/v1/logout?scope=local',{token,method:'POST'});
          // RLS must deny the same token after provider session revocation before we report success.
          const members=await upstream('/rest/v1/core_founders?select=user_id&user_id=eq.'+owner,{token});
          if(!Array.isArray(members)||members.length!==0)return send(503,{error:'logout-not-confirmed'});
        }
        return send(200,{authenticated:false},{'Set-Cookie':cookie()});
      }
      if(!token)return send(401,{error:'sign-in-required'},{'Set-Cookie':cookie()});
      const user=await upstream('/auth/v1/user',{token});if(user?.id!==owner)return send(403,{error:'founder-only'});
      const members=await upstream('/rest/v1/core_founders?select=user_id&user_id=eq.'+owner,{token});
      if(!Array.isArray(members)||members.length!==1||members[0].user_id!==owner)return send(403,{error:'founder-only'});
      const route='/rest/v1/core_founder_workspaces?user_id=eq.'+owner;
      if(path==='/workspace'&&req.method==='GET'){
        const records=await upstream(route+'&select=data,revision,updated_at',{token});if(records?.length!==1)return send(503,{error:'workspace-not-provisioned'});
        return send(200,{...records[0],data:validateWorkspace(records[0].data)});
      }
      if(path==='/workspace'&&req.method==='PATCH'){
        if(!Number.isSafeInteger(body.revision)||body.revision<0)return send(400,{error:'invalid-input'});
        let data;try{data=validateWorkspace(body.data);}catch{return send(400,{error:'invalid-input'});}
        const previous=await upstream(route+'&select=data,revision&revision=eq.'+body.revision,{token});if(previous?.length!==1)return send(409,{error:'workspace-conflict'});
        data.activity=[...validateWorkspace(previous[0].data).activity,{at:new Date().toISOString(),kind:'workspace-saved'}].slice(-30);
        const records=await upstream(route+'&revision=eq.'+body.revision,{token,method:'PATCH',headers:{Prefer:'return=representation'},body:{data,revision:body.revision+1,updated_at:new Date().toISOString()}});
        if(records?.length!==1)return send(409,{error:'workspace-conflict'});return send(200,{...records[0],data:validateWorkspace(records[0].data)});
      }
      if(path==='/session'&&req.method==='GET'){let expiresAt;try{expiresAt=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).exp*1000;}catch{}return send(200,{authenticated:true,role:'founder',...(Number.isFinite(expiresAt)?{expiresAt}: {})});}
      return send(404,{error:'unknown-operation'});
    }catch(e){return send(e.status===401||e.status===403?401:503,{error:e.status===401||e.status===403?'session-expired':'account-unavailable'},e.status===401||e.status===403?{'Set-Cookie':cookie()}:{});}
  };
}
