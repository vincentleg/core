const fs=require('fs');
const {assemble}=require('./scripts/lib/corridor-build.cjs');
const t=fs.readFileSync('src/template.html','utf8');
const out=assemble(t,fs.readFileSync('src/engine.js','utf8'),fs.readFileSync('src/app.js','utf8'));
fs.writeFileSync('corridor.html',out); console.log('built',out.length,'bytes');
