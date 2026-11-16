// A ToolJet CLI stand-in with source-pull's real refuse-then-force semantics for frontend/src: a plain pull refuses over
// local changes; --force keeps a copy of the changed files in .tooljet/before-pull/revision-N-<ms> and makes
// frontend/src equal to the store (FAKE_STORE: src/ plus store.json { revision }). FAKE_FAIL names a file whose presence
// makes the next source-pull fail once (a network blip). dev --once uploads frontend/src and bumps the revision.
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(args) + '\n');
const store = process.env.FAKE_STORE;
const meta = path.join(store, 'store.json');
const local = path.join(process.cwd(), '.tooljet', 'source.json');
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
const walk = (d, b = d, o = {}) => {
  if (!fs.existsSync(d)) return o;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, b, o);
    else o[path.relative(b, f)] = fs.readFileSync(f, 'utf8');
  }
  return o;
};
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[1] === 'source-pull') {
  if (process.env.FAKE_FAIL && fs.existsSync(process.env.FAKE_FAIL)) { fs.rmSync(process.env.FAKE_FAIL); console.log('request to ToolJet failed: ECONNRESET'); process.exit(1); }
  const stored = read(meta);
  if (stored.revision === undefined) { console.log('No source is stored on ToolJet for this version yet'); process.exit(0); }
  const mine = walk(path.join(process.cwd(), 'frontend', 'src'));
  const theirs = walk(path.join(store, 'src'));
  const differ = [...new Set([...Object.keys(mine), ...Object.keys(theirs)])].filter((k) => mine[k] !== theirs[k]);
  if (read(local).revision === stored.revision && !args.includes('--force')) { console.log('Already at revision ' + stored.revision); process.exit(0); }
  if (differ.length && !args.includes('--force')) { console.log("Not pulled. These files differ from ToolJet's code (revision " + stored.revision + '):\n' + differ.join('\n')); process.exit(1); }
  let kept = '';
  const changed = differ.filter((k) => k in mine);
  if (changed.length) {
    kept = path.join('.tooljet', 'before-pull', 'revision-' + stored.revision + '-' + Date.now() + '-' + process.pid);
    for (const k of changed) { const t = path.join(process.cwd(), kept, 'frontend/src', k); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.writeFileSync(t, mine[k]); }
  }
  fs.rmSync(path.join(process.cwd(), 'frontend', 'src'), { recursive: true, force: true });
  fs.cpSync(path.join(store, 'src'), path.join(process.cwd(), 'frontend', 'src'), { recursive: true });
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, JSON.stringify({ revision: stored.revision, owner: 'platform' }));
  console.log('Pulled revision ' + stored.revision + ': files written' + (kept ? '\nA copy of your changed files (' + changed.length + ') is in ' + kept : ''));
  process.exit(0);
}
if (args[1] === 'dev') {
  const revision = (read(meta).revision ?? 0) + 1;
  fs.rmSync(path.join(store, 'src'), { recursive: true, force: true });
  fs.cpSync(path.join(process.cwd(), 'frontend', 'src'), path.join(store, 'src'), { recursive: true });
  fs.writeFileSync(meta, JSON.stringify({ revision }));
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, JSON.stringify({ revision, owner: 'platform' }));
  console.log('Open: http://localhost/editor');
  process.exit(0);
}
console.log('ok');
