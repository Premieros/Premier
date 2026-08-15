#!/usr/bin/env node
// ============================================================================
// Production schema-parity gate.
//
// WHY: the deploy chain must never publish a frontend that is newer than the
// database it talks to. The published app calls RPC functions and reads tables
// over PostgREST; if any of those objects is missing from the PRODUCTION schema
// cache, the live page fails with PGRST202/PGRST205 ("Could not find the
// function/table ... in the schema cache").
//
// WHAT: this script extracts, from the frontend source, the exact RPC calls
// (function name + parameter names) and the tables read with supabase.from(),
// then probes the PRODUCTION Supabase REST API with the same arguments the app
// would send. A missing function/table (404 PGRST202 / 404 PGRST205) fails the
// gate and the frontend is NOT published.
//
//   POST {url}/rest/v1/rpc/{name}   body { all params null }
//   GET  {url}/rest/v1/{table}?select=id&limit=1
//
// Response discrimination:
//   * 404 with code PGRST202/PGRST205  -> object absent from schema cache -> FAIL
//   * any other status (200/400/401/403/500) -> object is present in the cache
//     (401/403 mean the anon role lacks EXECUTE/SELECT, which still proves the
//     object exists; 400/500 mean it matched and executed with null args).
//
// Configuration comes from the workflow env (same values the build uses):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
//
//   node scripts/db/check-production-parity.js
//   exit code 0 = frontend schema is fully present in production
//   exit code 1 = at least one required function/table is missing
// ============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..', '..');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (as in the build job).');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Extract RPC calls:  methodName(p: { p_a; p_b; ... }): ... { return rpc('fn', p); }
// ---------------------------------------------------------------------------
function extractRpcCalls() {
  const source = readFileSync(join(ROOT, 'src', 'api', 'modules.ts'), 'utf8');
  const calls = new Map();
  // For each rpc call, find the nearest preceding `(p: {` property block in the
  // same line group, then collect every `p_<name>:` token (RPC params are all
  // p_-prefixed by convention; nested object keys are not).
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/return rpc\('([\w_]+)', p\);/);
    if (!m) continue;
    const fn = m[1];
    // Scan upward for the nearest `(p: {` declaration.
    for (let j = i; j >= 0; j -= 1) {
      if (lines[j].includes('(p: {')) {
        const params = [...new Set([...lines[j].matchAll(/p_([\w]+)(?=\s*:)/g)].map((x) => x[1]))];
        calls.set(fn, params);
        break;
      }
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Extract tables read through supabase.from('<table>')
// ---------------------------------------------------------------------------
function extractTables() {
  const tables = new Set();
  for (const file of walk(join(ROOT, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/supabase\.from\('([\w]+)'\)/g)) tables.add(m[1]);
  }
  return [...tables].sort();
}

async function probeRpc(name, params, headers) {
  const body = Object.fromEntries(params.map((p) => [`p_${p}`, null]));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    const text = await res.text();
    if (text.includes('PGRST202')) return 'missing';
  }
  return 'present';
}

async function probeTable(name, headers) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${name}?select=id&limit=1`, {
    method: 'GET',
    headers,
  });
  if (res.status === 404) {
    const text = await res.text();
    if (text.includes('PGRST205')) return 'missing';
  }
  return 'present';
}

async function main() {
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

  const rpcs = extractRpcCalls();
  const tables = extractTables();

  console.log(`PRODUCTION PARITY CHECK  ${SUPABASE_URL}`);
  console.log(`RPC functions to verify : ${rpcs.size}`);
  console.log(`Tables to verify       : ${tables.length}`);
  console.log('');

  const missingRpc = [];
  const missingTables = [];

  for (const [name, params] of rpcs) {
    const status = await probeRpc(name, params, headers);
    if (status === 'missing') missingRpc.push(`${name}(${params.map((p) => `p_${p}`).join(', ')})`);
    process.stdout.write(`  ${status === 'present' ? 'ok ' : 'FAIL'} rpc ${name}\n`);
  }

  for (const name of tables) {
    const status = await probeTable(name, headers);
    if (status === 'missing') missingTables.push(name);
    process.stdout.write(`  ${status === 'present' ? 'ok ' : 'FAIL'} table ${name}\n`);
  }

  console.log('');
  if (missingRpc.length === 0 && missingTables.length === 0) {
    console.log('PARITY OK: every frontend RPC and table is present in the production schema cache.');
    process.exit(0);
  }

  console.error('PARITY FAILED: the frontend requires schema objects that are MISSING from production.');
  console.error('The database is behind the frontend. Do NOT publish. Apply the matching migrations first.');
  if (missingRpc.length) {
    console.error(`\nMissing RPC functions (${missingRpc.length}):`);
    missingRpc.forEach((f) => console.error(`  - ${f}`));
  }
  if (missingTables.length) {
    console.error(`\nMissing tables (${missingTables.length}):`);
    missingTables.forEach((t) => console.error(`  - ${t}`));
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
