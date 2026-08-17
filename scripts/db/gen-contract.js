#!/usr/bin/env node
// ============================================================================
// Generates the frontend schema contract: the exact RPC calls (name + params)
// and supabase.from() table reads the frontend makes, in a single committed
// JSON file. This is the single source of truth that the parity gate
// (check-production-parity.js) and verify-schema.js consume, so the contract
// can never silently drift from the code.
//
//   node scripts/db/gen-contract.js [--check]
//
// Writes: supabase/api-contract.json
//   --check  exits 1 if the committed contract is stale (used by CI).
// ============================================================================

import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..', '..');
const CONTRACT_FILE = join(ROOT, 'supabase', 'api-contract.json');
const checkMode = process.argv.includes('--check');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist') continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function extractRpcCalls() {
  const calls = new Map();
  for (const file of walk(join(ROOT, 'src', 'api', 'domains'))) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i].match(/return rpc\('([\w_]+)', p\);/);
      if (!m) continue;
      const fn = m[1];
      for (let j = i; j >= 0; j -= 1) {
        if (lines[j].includes('(p: {')) {
          const params = [...new Set([...lines[j].matchAll(/p_([\w]+)(?=\s*:)/g)].map((x) => x[1]))].sort();
          calls.set(fn, params);
          break;
        }
      }
    }
  }
  return calls;
}

function extractTables() {
  const tables = new Set();
  for (const file of walk(join(ROOT, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/supabase\.from\('([\w]+)'\)/g)) tables.add(m[1]);
  }
  return [...tables].sort();
}

const contract = {
  generated_at: new Date().toISOString(),
  source: 'scripts/db/gen-contract.js (extracted from src/api/domains + src)',
  rpcs: [...extractRpcCalls().entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, params]) => ({ name, params })),
  tables: extractTables(),
};

const existing = (() => {
  try { return JSON.parse(readFileSync(CONTRACT_FILE, 'utf8')); } catch { return null; }
})();

if (checkMode) {
  const normalize = (c) => JSON.stringify({ rpcs: c.rpcs, tables: c.tables });
  if (existing && normalize(existing) === normalize(contract)) {
    console.log(`CONTRACT OK: supabase/api-contract.json is up to date (${contract.rpcs.length} RPCs, ${contract.tables.length} tables).`);
    process.exit(0);
  }
  const oldRpcs = new Map((existing?.rpcs || []).map((x) => [x.name, JSON.stringify(x.params)]));
  const newRpcs = new Map(contract.rpcs.map((x) => [x.name, JSON.stringify(x.params)]));
  const oldTables = new Set(existing?.tables || []);
  const newTables = new Set(contract.tables);
  const changedRpcs = contract.rpcs.filter((x) => oldRpcs.get(x.name) !== JSON.stringify(x.params));
  const removedRpcs = (existing?.rpcs || []).filter((x) => !newRpcs.has(x.name));
  const addedTables = contract.tables.filter((x) => !oldTables.has(x));
  const removedTables = (existing?.tables || []).filter((x) => !newTables.has(x));
  const duplicateNames = (items) => items.filter((x, i) => items.indexOf(x) !== i);
  const firstRpcDiff = (existing?.rpcs || []).findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(contract.rpcs[i]));
  const firstTableDiff = (existing?.tables || []).findIndex((x, i) => x !== contract.tables[i]);
  console.error('CONTRACT STALE: supabase/api-contract.json does not match src.');
  console.error(JSON.stringify({ changedRpcs, removedRpcs, addedTables, removedTables, duplicateRpcs: duplicateNames((existing?.rpcs || []).map((x) => x.name)), duplicateTables: duplicateNames(existing?.tables || []), firstRpcDiff: firstRpcDiff < 0 ? null : { index: firstRpcDiff, existing: existing.rpcs[firstRpcDiff], generated: contract.rpcs[firstRpcDiff] }, firstTableDiff: firstTableDiff < 0 ? null : { index: firstTableDiff, existing: existing.tables[firstTableDiff], generated: contract.tables[firstTableDiff] } }, null, 2));
  process.exit(1);
}

writeFileSync(CONTRACT_FILE, `${JSON.stringify(contract, null, 2)}\n`);
console.log(`Wrote supabase/api-contract.json (${contract.rpcs.length} RPCs, ${contract.tables.length} tables).`);
