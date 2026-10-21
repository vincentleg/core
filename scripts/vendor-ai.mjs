// Rebuilds the on-device AI bundles (WebLLM, Transformers.js + ONNX Runtime Web) from the committed lockfile in
// scripts/vendor-ai/. The outputs are third-party files too large for the repository's integrity policy (an 27 MB wasm),
// so they stay ignored and are reproduced here, then checked against pinned SHA-256 values before any use.
//   node scripts/vendor-ai.mjs            (idempotent; network only for the npm registry)
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const ROOT=process.cwd(),SRC=path.join(ROOT,'scripts/vendor-ai'),WORK=path.join(ROOT,'.core-local/vendor-ai');
export const VENDOR={
 'assets/vendor/web-llm-0.2.85/web-llm.mjs':'d93803844ef0d193059a41c18dfa2850407d4a9132199578f5808d791bf526f1',
 'assets/vendor/transformers-4.3.0/transformers.mjs':'a182e5aabc71c3c7b507652c15209fd3c483b815a33d6714b841d0714ab6e241',
 'assets/vendor/transformers-4.3.0/ort-wasm-simd-threaded.asyncify.mjs':'0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611',
 'assets/vendor/transformers-4.3.0/ort-wasm-simd-threaded.asyncify.wasm':'49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082'
};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ok=()=>Object.entries(VENDOR).every(([f,h])=>fs.existsSync(f)&&sha(f)===h);
if(!ok()){
 fs.mkdirSync(WORK,{recursive:true});for(const f of ['package.json','package-lock.json'])fs.copyFileSync(path.join(SRC,f),path.join(WORK,f));
 execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:WORK,stdio:'inherit'});
 execFileSync('npm',['rebuild','esbuild'],{cwd:WORK,stdio:'inherit'});
 const nm=p=>path.join(WORK,'node_modules',p),out=f=>{fs.mkdirSync(path.dirname(f),{recursive:true});return f;};
 fs.writeFileSync(out('assets/vendor/web-llm-0.2.85/web-llm.mjs'),fs.readFileSync(nm('@mlc-ai/web-llm/lib/index.js'),'utf8').replace(/^\/\/# sourceMappingURL=.*\n?/m,''));
 fs.copyFileSync(nm('@mlc-ai/web-llm/LICENSE'),out('assets/vendor/web-llm-0.2.85/LICENSE'));
 fs.writeFileSync(path.join(WORK,'entry.mjs'),"export { pipeline, env } from '@huggingface/transformers';\n");
 execFileSync(nm('.bin/esbuild'),['entry.mjs','--bundle','--format=esm','--platform=browser','--minify','--legal-comments=eof','--conditions=browser','--main-fields=browser,module,main','--alias:onnxruntime-web/webgpu=./node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs','--external:sharp','--external:onnxruntime-node','--outfile=transformers.mjs'],{cwd:WORK,stdio:'inherit'});
 fs.copyFileSync(path.join(WORK,'transformers.mjs'),out('assets/vendor/transformers-4.3.0/transformers.mjs'));
 for(const f of ['ort-wasm-simd-threaded.asyncify.mjs','ort-wasm-simd-threaded.asyncify.wasm'])fs.copyFileSync(nm('onnxruntime-web/dist/'+f),out('assets/vendor/transformers-4.3.0/'+f));
 fs.copyFileSync(nm('@huggingface/transformers/LICENSE'),'assets/vendor/transformers-4.3.0/LICENSE-transformers');
 fs.copyFileSync(path.join(SRC,'LICENSE-onnxruntime-web'),'assets/vendor/transformers-4.3.0/LICENSE-onnxruntime-web');
}
const bad=Object.entries(VENDOR).filter(([f,h])=>!fs.existsSync(f)||sha(f)!==h).map(([f])=>f);
if(bad.length)throw Error('vendor-ai: checksum mismatch, refusing to use: '+bad.join(', '));
console.log('vendor-ai: '+Object.keys(VENDOR).length+' pinned files verified');
