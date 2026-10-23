// Package existing public assets and isolated server functions. No environment values or private seed are copied.
import fs from 'node:fs';import path from 'node:path';import { fileURLToPath } from 'node:url';
export function packageAccountRelease(root='public') {
  const output=path.join(root,'.vercel/output'),statics=path.join(output,'static'),functions=path.join(output,'functions/api/account');
  fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(statics,{recursive:true});fs.mkdirSync(functions,{recursive:true});
  for(const item of fs.readdirSync(root)){if(item.startsWith('.')||item==='vercel.json')continue;fs.cpSync(path.join(root,item),path.join(statics,item),{recursive:true});}
  const handler=fs.readFileSync(new URL('./handler.mjs',import.meta.url),'utf8');
  for(const operation of ['login','verify','callback','logout','session','workspace']){
    const directory=path.join(functions,operation+'.func');fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory,'handler.mjs'),handler);
    fs.writeFileSync(path.join(directory,'index.mjs'),`import { createAccountHandler } from './handler.mjs';\nconst handle=createAccountHandler();\nexport default (req,res)=>{req.url='/api/account/${operation}';return handle(req,res);};\n`);
    fs.writeFileSync(path.join(directory,'.vc-config.json'),JSON.stringify({runtime:'nodejs22.x',handler:'index.mjs',launcherType:'Nodejs',maxDuration:30}));
  }
  const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
  const routes=[
    {src:'/(.*)',has:[{type:'host',value:'www.creationofrebornearth.com'}],status:308,headers:{Location:'https://creationofrebornearth.com/$1'}},
    {src:'/index.html',status:308,headers:{Location:'/'}},
    {src:'/(.*)',headers,continue:true},
    {src:'/(src|assets)/(.*)',headers:{'Cache-Control':'public, max-age=300, must-revalidate'},continue:true},
    {src:'/api/account/(.*)',headers:{'Cache-Control':'private, no-store',Vary:'Cookie'},continue:true},
    {src:'/',dest:'/world.html'},{src:'/favicon.ico',dest:'/assets/brand/core-mark.svg'},
    {handle:'filesystem'}
  ];
  fs.writeFileSync(path.join(output,'config.json'),JSON.stringify({version:3,routes},null,2)+'\n');return output;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){await import('../build-public.mjs');packageAccountRelease();console.log('Account release packaged locally; nothing deployed.');}
