const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('account release isolates function source, retains public routes and never packages private environment files',async()=>{
 const {packageAccountRelease}=await import('../scripts/account/build-release.mjs'),root=fs.mkdtempSync(path.join(os.tmpdir(),'core-account-package-'));
 try{fs.writeFileSync(path.join(root,'world.html'),'public fixture');fs.writeFileSync(path.join(root,'me.html'),'public fixture');fs.writeFileSync(path.join(root,'.env.local'),'fixture must not ship');fs.writeFileSync(path.join(root,'vercel.json'),JSON.stringify({headers:[{headers:[{key:'X-Content-Type-Options',value:'nosniff'}]}]}));
 const output=packageAccountRelease(root);assert.deepEqual(fs.readdirSync(path.join(output,'static')).sort(),['me.html','world.html']);
 const routes=JSON.parse(fs.readFileSync(path.join(output,'config.json'))).routes;assert.ok(routes.some(r=>r.src==='/'&&r.dest==='/world.html'));assert.ok(routes.some(r=>r.src==='/api/account/(.*)'&&r.headers['Cache-Control']==='private, no-store'));
 const dir=path.join(output,'functions/api/account');assert.equal(fs.readdirSync(dir).length,6);for(const op of fs.readdirSync(dir)){const config=JSON.parse(fs.readFileSync(path.join(dir,op,'.vc-config.json')));assert.equal(config.runtime,'nodejs22.x');assert.ok(!config.environment);assert.ok(!fs.existsSync(path.join(dir,op,'.env.local')));}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
