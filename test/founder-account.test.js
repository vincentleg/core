const test=require('node:test'),assert=require('node:assert/strict'),{Readable}=require('node:stream');
const owner='11111111-1111-4111-8111-111111111111',origin='https://core-account.invalid';
const env={CORE_SUPABASE_URL:'https://core-fixture.supabase.co',CORE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_local_fixture_not_a_real_key',CORE_FOUNDER_USER_ID:owner,CORE_FOUNDER_EMAIL:'owner@example.invalid',CORE_ACCOUNT_ORIGIN:origin};
const workspace={profile:{name:'Test founder',organization:'Test organization'},prospects:[{id:'example',company:'Private fixture prospect',product:'CORE Business',status:'prospect',tasks:[],project:{mode:'present',parameters:{}}}]};
async function request(handler,path,method='GET',body,headers={}){const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);Object.assign(req,{url:'/api/account/'+path,method,headers:{...(method==='GET'?{}:{origin,'content-type':'application/json'}),...headers}});let result={};const res={writeHead:(code,headers)=>Object.assign(result,{code,headers}),end:body=>result.body=JSON.parse(body)};await handler(req,res);return result;}
test('account fails closed before configuration, rejects anonymous/cross-origin/other-account access and never returns tokens',async()=>{
 const {createAccountHandler}=await import('../scripts/account/handler.mjs');let calls=[],loggedOut=false;
 assert.equal((await request(createAccountHandler({env:{},fetcher:()=>{throw Error('must not fetch');}}),'workspace')).code,503);
 const handler=createAccountHandler({env,fetcher:async(url,opts)=>{calls.push({url,opts});if(url.includes('/logout?')){loggedOut=true;return new Response(null,{status:204});}if(url.endsWith('/verify'))return Response.json({user:{id:owner},access_token:'fixture.jwt.token',expires_in:3600});if(url.endsWith('/user'))return Response.json({id:opts.headers.Authorization==='Bearer other'? 'different-user':owner});if(url.includes('core_founders?'))return Response.json(loggedOut?[]:[{user_id:owner}]);if(url.includes('core_founder_workspaces?'))return Response.json([{revision:0,data:workspace}]);return Response.json({});}});
 assert.equal((await request(handler,'workspace')).code,401);assert.equal(calls.length,0);
 assert.equal((await request(handler,'login','POST',{email:env.CORE_FOUNDER_EMAIL},{origin:'https://evil.invalid'})).code,403);
 assert.equal((await request(handler,'workspace','GET',undefined,{cookie:'__Host-core_account=other'})).code,403);
 const signed=await request(handler,'verify','POST',{email:env.CORE_FOUNDER_EMAIL,code:'123456'});assert.equal(signed.code,200);assert.match(signed.headers['Set-Cookie'][0],/HttpOnly; Secure; SameSite=Strict/);assert.ok(!JSON.stringify(signed.body).includes('token'));
 const good=await request(handler,'workspace','GET',undefined,{cookie:'__Host-core_account=fixture.jwt.token'});assert.equal(good.code,200);assert.match(good.headers['Cache-Control'],/private, no-store/);assert.equal(good.body.data.profile.name,'Test founder');
 assert.equal((await request(handler,'workspace','PATCH',{revision:0,data:workspace},{cookie:'__Host-core_account=fixture.jwt.token'})).code,200);
 const logout=await request(handler,'logout','POST',{}, {cookie:'__Host-core_account=fixture.jwt.token'});assert.equal(logout.code,200);assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);assert.equal((await request(handler,'workspace','GET',undefined,{cookie:'__Host-core_account=fixture.jwt.token'})).code,403);
});
test('provider failures and expired sessions fail closed; malformed private data and concurrent saves are rejected',async()=>{
 const {createAccountHandler,validateWorkspace}=await import('../scripts/account/handler.mjs');assert.throws(()=>validateWorkspace({...workspace,prospects:[{...workspace.prospects[0],project:{parameters:{hvac:999}},tasks:[]}]}));
 const expired=createAccountHandler({env,fetcher:async()=>Response.json({message:'private provider detail'},{status:401})});const r=await request(expired,'workspace','GET',undefined,{cookie:'__Host-core_account=expired'});assert.equal(r.code,401);assert.equal(r.body.error,'session-expired');assert.ok(!JSON.stringify(r).includes('private provider detail'));
 const conflict=createAccountHandler({env,fetcher:async(url)=>Response.json(url.endsWith('/user')?{id:owner}:url.includes('core_founders?')?[{user_id:owner}]:[])});
 const revoked=createAccountHandler({env,fetcher:async(url)=>Response.json(url.endsWith('/user')?{id:owner}:[])});assert.equal((await request(revoked,'workspace','GET',undefined,{cookie:'__Host-core_account=test'})).code,403);
 assert.equal((await request(conflict,'workspace','PATCH',{revision:0,data:workspace},{cookie:'__Host-core_account=test'})).code,409);
});

test('invitation validates provider user ID and active membership; refuses secret keys, replay and unconfirmed logout',async()=>{
 const {createAccountHandler}=await import('../scripts/account/handler.mjs');
 const callback={type:'invite',token_hash:'f'.repeat(64)};let user=owner,members=true,used=false;
 const handler=createAccountHandler({env,fetcher:async(url)=>{
  if(url.endsWith('/verify')){if(used)return Response.json({},{status:403});used=true;return Response.json({access_token:'fixture.jwt.token',expires_in:3600,user:{id:owner}});}
  if(url.endsWith('/user'))return Response.json({id:user});
  if(url.includes('core_founders?'))return Response.json(members?[{user_id:owner}]:[]);
  if(url.includes('/logout?'))return new Response(null,{status:204});return Response.json({});
 }});
 assert.equal((await request(handler,'callback','POST',{...callback,type:'recovery'})).code,400);
 assert.equal((await request(handler,'callback','POST',callback)).code,200);
 assert.equal((await request(handler,'callback','POST',callback)).code,401);
 assert.equal((await request(handler,'logout','POST',{}, {cookie:'__Host-core_account=test'})).code,503,'Never claim logout while RLS still grants the session');
 used=false;user='different-user';assert.equal((await request(handler,'callback','POST',callback)).code,403,'Do not trust verify payload ID or matching email');
 user=owner;members=false;used=false;assert.equal((await request(handler,'callback','POST',callback)).code,403);
 for(const key of ['sb_secret_fake_fixture_not_a_real_key','legacy-service-role-key'])assert.equal((await request(createAccountHandler({env:{...env,CORE_SUPABASE_PUBLISHABLE_KEY:key}}),'session')).code,503);
 const failure=createAccountHandler({env,fetcher:async()=>Response.json({},{status:500})});const result=await request(failure,'logout','POST',{}, {cookie:'__Host-core_account=test'});assert.equal(result.code,503);assert.equal(result.headers['Set-Cookie'],undefined,'Preserve retryable session on provider outage');
});
test('invitation callback erases URL tokens, rejects implicit sessions and never accepts an open redirect',async()=>{
 const {consumeAccountCallback}=await import('../src/me/account-callback.mjs');let target;const history={replaceState:(a,b,url)=>target=url};
 assert.equal(consumeAccountCallback({pathname:'/me.html',search:'',hash:'#founder-account'},history),null);
 const result=consumeAccountCallback({pathname:'/me.html',search:'?next=https://evil.invalid',hash:'#type=invite&token_hash='+('f'.repeat(64))},history);assert.equal(result.type,'invite');assert.ok(!target.includes('token_hash'));assert.ok(target.startsWith('/me.html?'));
 assert.throws(()=>consumeAccountCallback({pathname:'/me.html',search:'',hash:'#access_token=fixture&refresh_token=fixture'},history));assert.equal(target,'/me.html#founder-account');
 assert.throws(()=>consumeAccountCallback({pathname:'/me.html',search:'?token_hash=fixture&type=invite',hash:''},history));assert.equal(target,'/me.html#founder-account');
});
test('email link sign-in binds a PKCE verifier to this browser, reveals nothing about other addresses and refuses missing verifiers',async()=>{
 const {createAccountHandler}=await import('../scripts/account/handler.mjs'),crypto=require('node:crypto');let calls=[];
 const handler=createAccountHandler({env,fetcher:async(url,opts)=>{calls.push({url,body:opts.body&&JSON.parse(opts.body)});if(url.includes('/otp?'))return Response.json({});if(url.includes('grant_type=pkce'))return Response.json({access_token:'fixture.jwt.token',expires_in:3600});if(url.endsWith('/user'))return Response.json({id:owner});if(url.includes('core_founders?'))return Response.json([{user_id:owner}]);return Response.json({});}});
 const other=await request(handler,'login','POST',{email:'someone-'+env.CORE_FOUNDER_EMAIL});assert.equal(other.code,200);assert.match(other.headers['Set-Cookie'],/^__Host-core_pkce=[A-Za-z0-9_-]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=900$/);assert.equal(calls.length,0);
 const sent=await request(handler,'login','POST',{email:env.CORE_FOUNDER_EMAIL.toUpperCase()});assert.equal(sent.code,200);assert.deepEqual(Object.keys(sent.body),['sent']);
 const verifier=sent.headers['Set-Cookie'].split(';')[0].split('=')[1],otp=calls[0];
 assert.equal(otp.url,env.CORE_SUPABASE_URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(origin+'/me.html'));assert.equal(otp.body.create_user,false);assert.equal(otp.body.code_challenge_method,'s256');assert.equal(otp.body.code_challenge,crypto.createHash('sha256').update(verifier).digest('base64url'));
 assert.equal((await request(handler,'callback','POST',{type:'pkce',code:'0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0'})).code,400,'A link opened without the requesting browser verifier is refused');
 const signed=await request(handler,'callback','POST',{type:'pkce',code:'0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0'},{cookie:'__Host-core_pkce='+verifier});assert.equal(signed.code,200);
 assert.deepEqual(calls.at(-3).body,{auth_code:'0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',code_verifier:verifier});
 assert.match(signed.headers['Set-Cookie'][0],/^__Host-core_account=fixture\.jwt\.token;/);assert.match(signed.headers['Set-Cookie'][1],/^__Host-core_pkce=; .*Max-Age=0$/);assert.ok(!JSON.stringify(signed.body).includes('token'));
});
test('email link callback reads and erases the one-time code, refusing provider errors and malformed codes',async()=>{
 const {consumeAccountCallback}=await import('../src/me/account-callback.mjs');let target;const history={replaceState:(a,b,url)=>target=url};
 assert.deepEqual(consumeAccountCallback({pathname:'/me.html',search:'?code=0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0&lang=fr',hash:''},history),{code:'0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0',type:'pkce'});assert.equal(target,'/me.html?lang=fr#founder-account');
 assert.throws(()=>consumeAccountCallback({pathname:'/me.html',search:'?error=access_denied&error_code=otp_expired',hash:''},history));assert.equal(target,'/me.html#founder-account');
 assert.throws(()=>consumeAccountCallback({pathname:'/me.html',search:'?code=../evil',hash:''},history));
});
