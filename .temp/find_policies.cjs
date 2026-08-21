const fs = require('fs');
const path = require('path');

const dir = 'supabase/migrations';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

// Track final policy names per table
const policies = new Map(); // table -> Map<policyName, {op, migration}>
const dropLog = new Map(); // table -> Set<policyName>

function getTablePolicies(table) {
  if (!policies.has(table)) policies.set(table, new Map());
  return policies.get(table);
}

function getTableDrops(table) {
  if (!dropLog.has(table)) dropLog.set(table, new Set());
  return dropLog.get(table);
}

const tables = [
  'raw_materials','raw_material_inventory','raw_material_batches',
  'recipes','recipe_items','production_orders','production_waste',
  'warehouse_transfers','warehouse_transfer_items','inventory_batches','inventory_ledger',
  'chart_of_accounts','account_mappings','journal_entries','journal_entry_lines',
  'customer_payments','supplier_payments','treasury_accounts','treasury_transactions',
  'bank_reconciliations','bank_statement_lines',
  'dining_areas','dining_tables','orders','order_items',
  'branch_settings','order_kitchen_sends','waste_entries',
  'products','categories','warehouses','customers','suppliers','expenses',
  'sales','purchases','stock_transactions','shifts','shift_operations',
  'audit_log','users','settings','product_units','product_components'
];

for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = sql.split('\n');
  
  for (const line of lines) {
    // CREATE POLICY
    const createMatch = line.match(/CREATE POLICY\s+["']?(\w+)["']?\s+ON\s+(?:public\.)?(\w+)/i);
    if (createMatch) {
      const [, policyName, table] = createMatch;
      if (tables.includes(table)) {
        getTablePolicies(table).set(policyName, file);
      }
    }
    
    // DROP POLICY IF EXISTS
    const dropMatch = line.match(/DROP POLICY\s+(?:IF EXISTS\s+)?["']?(\w+)["']?\s+ON\s+(?:public\.)?(\w+)/i);
    if (dropMatch) {
      const [, policyName, table] = dropMatch;
      if (tables.includes(table)) {
        const pm = getTablePolicies(table);
        if (pm.has(policyName)) {
          pm.delete(policyName); // dropped before re-created
        }
      }
    }
  }
}

// Output final policy names per table
for (const table of tables) {
  const pm = getTablePolicies(table);
  if (pm.size > 0) {
    const names = Array.from(pm.keys()).sort();
    console.log(`${table}: ${names.join(', ')}`);
  }
}
