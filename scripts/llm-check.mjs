// Local language-model check (Phase 4): hardware, runtime, model presence and setup instructions.
// Nothing is installed or downloaded by this script.
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../src/llm.js');

console.log(`Machine : ${os.cpus()[0].model}, ${os.cpus().length} cœurs, ${Math.round(os.totalmem() / 2 ** 30)} Go de RAM, ${os.platform()} ${os.arch()}`);
for (const id of ['ollama', 'openai-compatible-local']) {
  const p = L.PROVIDERS[id], r = await L.probe(p);
  console.log(`${p.label} (${p.baseUrl}) : ${r.available ? 'DISPONIBLE' : 'indisponible'} — ${r.reason}${r.models && r.models.length ? ` ; modèles : ${r.models.map(m => `${m.name}${m.parameters ? ` (${m.parameters}, ${m.quantization})` : ''}`).join(', ')}` : ''}`);
}
console.log(`
Mise en place (gratuite, locale, sans clé d’API) — validée sur Apple M1 Max 32 Go le 2026-10-13 :
  1. Ollama ${'v0.40.3'} (MIT) : binaire officiel ollama-darwin.tgz depuis https://github.com/ollama/ollama/releases
     (vérifier le SHA-256 publié), extrait dans ~/.local/ollama — sans droits administrateur.
  2. OLLAMA_HOST=127.0.0.1:11434 ~/.local/ollama/ollama serve      (écoute en local uniquement)
  3. ~/.local/ollama/ollama pull qwen3:8b                           (≈ 5,2 Go, Apache-2.0 ; ≈ 6–7 Go de RAM en exécution)
  4. node scripts/llm-check.mjs puis node scripts/cognitive.mjs
Le modèle ne fait que choisir des outils autorisés et rédiger des interprétations validées ; il ne calcule ni ne décide rien.`);
