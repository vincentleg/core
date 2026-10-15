'use strict';
const crypto = require('node:crypto');
function assemble(template, engine, app) {
  let html = template.replace('/*ENGINE*/', () => engine).replace('/*APP*/', () => app);
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => "'sha256-" + crypto.createHash('sha256').update(m[1]).digest('base64') + "'");
  const policy = ["default-src 'none'", "script-src " + hashes.join(' '), "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data: blob:", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
  return html.replace('<!--CORRIDOR_CSP-->', `<meta http-equiv="Content-Security-Policy" content="${policy}">`);
}
module.exports = { assemble };
