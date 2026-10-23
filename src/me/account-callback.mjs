// Read and erase a one-time sign-in code or invitation hash before any network request. Never accept access/refresh tokens in URLs.
export function consumeAccountCallback(location, history) {
  const hash=new URLSearchParams(location.hash.slice(1)),query=new URLSearchParams(location.search);
  const keys=['code','token_hash','type','access_token','refresh_token','error','error_code','error_description'];
  const present=keys.some(k=>hash.has(k)||query.has(k));if(!present)return null;
  const token_hash=hash.get('token_hash'),type=hash.get('type'),code=query.get('code');
  for(const key of keys)query.delete(key);
  history.replaceState(null,'',location.pathname+(query.size?'?'+query.toString():'')+'#founder-account');
  if(hash.has('access_token')||hash.has('refresh_token')||hash.has('error')||new URLSearchParams(location.search).has('error'))throw Error('invalid-invitation');
  // Email sign-in link (PKCE): the server pairs this one-time code with its HttpOnly verifier.
  if(code!==null){if(!/^[A-Za-z0-9-]{8,128}$/.test(code))throw Error('invalid-invitation');return{code,type:'pkce'};}
  if(!['invite','email'].includes(type)||!/^[A-Za-z0-9_-]{32,256}$/.test(token_hash||''))throw Error('invalid-invitation');
  return{token_hash,type};
}
