// Probe for a free local language-model runtime. Installs NOTHING; reports hardware and availability.
// node scripts/llm-check.mjs
import os from 'node:os';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../src/llm.js');
const st = fs.statfsSync('/');
console.log(`Machine : ${os.cpus()[0].model}, ${os.cpus().length} cœurs, ${(os.totalmem() / 2 ** 30).toFixed(0)} Go RAM, ${(st.bavail * st.bsize / 2 ** 30).toFixed(0)} Go libres`);
for (const p of Object.values(L.PROVIDERS).filter(p => p.kind === 'llm')) console.log(`${p.label} (${p.baseUrl}) : ${JSON.stringify(await L.probe(p))}`);
console.log(`
Mise en place (manuelle, gratuite, locale — non effectuée par CORE) :
  1. Installer Ollama (licence MIT) depuis https://ollama.com/download ou « brew install ollama ».
  2. « ollama pull qwen2.5:7b-instruct » (~4,7 Go ; adapté à 32 Go de RAM) puis « ollama serve ».
  3. Relancer ce script ; les missions pourront alors produire un brouillon de synthèse validé par src/llm.js.
Les calculs déterministes et les passerelles restent autoritatifs ; une phrase sans citation ou avec un chiffre non sourcé est rejetée.`);
