// CORE backend readiness — executes backend/schema.sql in a real PostgreSQL (PGlite, in-process WebAssembly build) and
// proves the isolation and governance properties with two users, a reviewer and a governance account.
// PGlite is NOT a project dependency: install it anywhere outside the repository and point to it:
//   npm i --prefix <scratch-dir> @electric-sql/pglite@0.3.8
//   CORE_PGLITE=<scratch-dir>/node_modules/@electric-sql/pglite/dist/index.js node scripts/backend-rls-check.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod = process.env.CORE_PGLITE; if (!mod) { console.error('Set CORE_PGLITE to an installed @electric-sql/pglite entry (see header).'); process.exit(2); }
const { PGlite } = await import(mod);
const db = new PGlite(), results = [];
const check = (name, ok, detail = '') => { assert.ok(ok, `${name} ${detail}`); results.push(name); console.log('PASS', name, detail); };
const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b', R = '00000000-0000-4000-8000-00000000000c', G = '00000000-0000-4000-8000-00000000000d';
// Supabase-compatible stubs: roles and auth.uid() from the request's JWT subject.
await db.exec(`create role anon nologin; create role authenticated nologin;
  create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
await db.exec(fs.readFileSync(new URL('../backend/schema.sql', import.meta.url), 'utf8'));
const as = async (who, sql, params = []) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who || ''}', false); set role ${who ? 'authenticated' : 'anon'};`); try { return await db.query(sql, params); } finally { await db.exec('reset role'); } };
const fails = async (who, sql, params = []) => { try { await as(who, sql, params); return false; } catch { return true; } };
const box = JSON.stringify({ ct: 'BASE64-CIPHERTEXT', iv: 'IV', salt: 'SALT', v: 1 });

const rls = (await db.query(`select relname, relrowsecurity, relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'core' and relkind = 'r'`)).rows;
check('every table has row level security enabled AND forced (deny by default)', rls.length === 7 && rls.every(r => r.relrowsecurity && r.relforcerowsecurity), rls.map(r => r.relname).join(','));
for (const [who, name] of [[A, 'alice'], [B, 'bob'], [R, 'rev'], [G, 'gov']]) await as(who, 'insert into core.profiles (id, pseudonym) values ($1, $2)', [who, name]);
check('a user cannot create a profile for someone else', await fails(A, 'insert into core.profiles (id, pseudonym) values ($1, $2)', ['00000000-0000-4000-8000-0000000000ff', 'fake']));
check('a user sees only their own profile', (await as(A, 'select id from core.profiles')).rows.map(r => r.id).join() === A);
await as(A, 'insert into core.idea_boxes (owner, box, kdf_iterations) values ($1, $2, 210000)', [A, box]);
check('User B cannot read User A’s private ideas', (await as(B, 'select * from core.idea_boxes')).rows.length === 0);
check('User B cannot modify User A’s private ideas', (await as(B, `update core.idea_boxes set box = '{"ct":"x","iv":"y","salt":"z"}' where owner = $1`, [A])).affectedRows === 0);
check('User B cannot delete User A’s private ideas', (await as(B, 'delete from core.idea_boxes where owner = $1', [A])).affectedRows === 0 && (await as(A, 'select 1 from core.idea_boxes')).rows.length === 1);
check('User B cannot write an idea box owned by A', await fails(B, 'insert into core.idea_boxes (owner, box, kdf_iterations) values ($1, $2, 210000)', [A, box]));
check('the server refuses plaintext idea storage and weak key derivation', await fails(B, `insert into core.idea_boxes (owner, box, kdf_iterations) values ($1, '{"ct":"x","iv":"y","salt":"z","plaintext":"secret"}', 210000)`, [B]) && await fails(B, 'insert into core.idea_boxes (owner, box, kdf_iterations) values ($1, $2, 1000)', [B, box]));
check('anonymous visitors read no private data', (await as(null, 'select * from core.contributions')).rows.length === 0 && await fails(null, 'select * from core.idea_boxes'));
const c = (await as(A, `insert into core.contributions (author, claim) values ($1, 'Le trottoir mesure 10 ft selon le relevé de 2014.') returning id`, [A])).rows[0].id;
const own = (await as(R, `insert into core.contributions (author, claim) values ($1, 'Une contribution du relecteur lui-même.') returning id`, [R])).rows[0].id;
check('contributions start in quarantine; an author cannot self-accept', await fails(A, `insert into core.contributions (author, claim, state) values ($1, 'Contribution auto-acceptée, interdit.', 'accepted')`, [A]) && (await as(A, `update core.contributions set state = 'accepted' where id = $1`, [c]).catch(() => ({ affectedRows: 0 }))).affectedRows === 0);
check('nobody can grant themselves a role or write roles directly', await fails(A, `insert into core.roles (account, role, granted_by) values ($1, 'reviewer', $1)`, [A]) && await fails(A, `select core.grant_role($1, 'reviewer', '')`, [B]));
await db.query(`insert into core.roles (account, role, granted_by) values ($1, 'governance', null)`, [G]); // bootstrap by the operator (superuser), outside the app
check('governance cannot self-grant', await fails(G, `select core.grant_role($1, 'reviewer', '')`, [G]));
await as(G, `select core.grant_role($1, 'reviewer', 'aucun conflit déclaré')`, [R]);
check('a non-reviewer cannot record a decision; decisions cannot be inserted directly', await fails(B, `select core.record_decision($1, 'accept', 'Raisons suffisamment détaillées ici.')`, [c]) && await fails(R, `insert into core.review_decisions (contribution, reviewer, decision, reasons) values ($1, $2, 'accept', 'Raisons suffisamment détaillées ici.')`, [c, R]));
check('a reviewer cannot decide on their own contribution', await fails(R, `select core.record_decision($1, 'accept', 'Raisons suffisamment détaillées ici.')`, [own]));
await as(R, `select core.record_decision($1, 'request-evidence', 'Mesure de 2014 : une mesure récente est nécessaire.')`, [c]);
check('a reviewer’s decision is visible to the author, with reasons, and changes the state', (await as(A, 'select decision, reasons from core.review_decisions')).rows[0]?.decision === 'request-evidence' && (await as(A, 'select state from core.contributions where id = $1', [c])).rows[0].state === 'in-review');
check('the audit log is not readable or writable by users', await fails(A, 'select * from core.audit_log') && await fails(A, `insert into core.audit_log (action) values ('forged')`) && (await db.query('select count(*)::int n from core.audit_log')).rows[0].n === 2);
const exp = (await as(A, 'select core.export_my_data() as d')).rows[0].d;
check('data export contains the person’s own data only (ciphertext stays ciphertext)', exp.profile.id === A && exp.idea_box.box.ct === 'BASE64-CIPHERTEXT' && exp.contributions.every(x => x.author === A));
await as(A, 'select core.delete_account()');
const left = (await db.query('select (select count(*)::int from core.profiles where id = $1) p, (select count(*)::int from core.idea_boxes where owner = $1) b, (select count(*)::int from core.contributions where author = $1) c', [A])).rows[0];
check('account deletion removes the profile, the idea box and the contributions', left.p + left.b + left.c === 0, JSON.stringify(left));
console.log(`RESULTS ${results.length}`);
