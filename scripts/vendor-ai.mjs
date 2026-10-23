// Rebuilds the on-device AI bundle (WebLLM) from the committed lockfile in scripts/vendor-ai/. The output is a 6.6 MB
// third-party file kept out of the repository; it is reproduced here and checked against a pinned SHA-256 before use.
//   node scripts/vendor-ai.mjs            (idempotent; network only for the npm registry)
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),SRC=path.join(ROOT,'scripts/vendor-ai'),WORK=path.join(ROOT,'.core-local/vendor-ai');
export const VENDOR={
 'assets/vendor/web-llm-0.2.85/web-llm.mjs':'d93803844ef0d193059a41c18dfa2850407d4a9132199578f5808d791bf526f1'
};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ok=()=>Object.entries(VENDOR).every(([f,h])=>fs.existsSync(f)&&sha(f)===h);
if(!ok()){
 fs.mkdirSync(WORK,{recursive:true});for(const f of ['package.json','package-lock.json'])fs.copyFileSync(path.join(SRC,f),path.join(WORK,f));
 execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:WORK,stdio:'inherit'});
 const nm=p=>path.join(WORK,'node_modules',p),out=f=>{fs.mkdirSync(path.dirname(f),{recursive:true});return f;};
 fs.writeFileSync(out('assets/vendor/web-llm-0.2.85/web-llm.mjs'),fs.readFileSync(nm('@mlc-ai/web-llm/lib/index.js'),'utf8').replace(/^\/\/# sourceMappingURL=.*\n?/m,''));
 fs.copyFileSync(nm('@mlc-ai/web-llm/LICENSE'),out('assets/vendor/web-llm-0.2.85/LICENSE'));
}
const bad=Object.entries(VENDOR).filter(([f,h])=>!fs.existsSync(f)||sha(f)!==h).map(([f])=>f);
if(bad.length)throw Error('vendor-ai: checksum mismatch, refusing to use: '+bad.join(', '));
console.log('vendor-ai: '+Object.keys(VENDOR).length+' pinned files verified');
