// Fix stale policy names in the migration file
const fs = require('fs');
const path = require('path');

const file = path.join('supabase', 'migrations', '20260821010000_tenant_data_isolation.sql');
let sql = fs.readFileSync(file, 'utf8');

// Map: for each table, list of stale policy names to drop before CREATE
const stalePolicies = {
  raw_materials: ['raw_materials_select'],
  raw_material_inventory: ['raw_material_inventory_select', 'raw_material_inventory_write'],
  raw_material_batches: ['raw_material_batches_select', 'raw_material_batches_write'],
  recipes: ['recipes_select', 'recipes_write'],
  recipe_items: ['recipe_items_select', 'recipe_items_write'],
  production_orders: ['production_orders_select', 'production_orders_write'],
  production_waste: ['production_waste_select', 'production_waste_write'],
  warehouse_transfers: ['warehouse_transfers_select', 'warehouse_transfers_write'],
  warehouse_transfer_items: ['warehouse_transfer_items_select', 'warehouse_transfer_items_write'],
  inventory_batches: ['inventory_batches_select', 'inventory_batches_write'],
  inventory_ledger: ['inventory_ledger_select', 'inventory_ledger_write'],
  chart_of_accounts: ['coa_select', 'coa_insert', 'coa_update', 'coa_delete'],
  account_mappings: ['account_mappings_select', 'account_mappings_insert', 'account_mappings_update', 'account_mappings_delete'],
  journal_entries: ['journal_entries_select', 'journal_entries_insert'],
  journal_entry_lines: ['journal_entry_lines_select', 'journal_entry_lines_insert'],
  customer_payments: ['customer_payments_select', 'customer_payments_insert'],
  supplier_payments: ['supplier_payments_select', 'supplier_payments_insert'],
  treasury_accounts: ['treasury_accounts_select', 'treasury_accounts_insert', 'treasury_accounts_update', 'treasury_accounts_delete'],
  treasury_transactions: ['treasury_transactions_select', 'treasury_transactions_insert'],
  bank_reconciliations: ['bank_reconciliations_select', 'bank_reconciliations_insert', 'bank_reconciliations_update'],
  bank_statement_lines: ['bank_statement_lines_select', 'bank_statement_lines_insert', 'bank_statement_lines_update'],
  dining_areas: ['auth_write_dining_areas', 'auth_write_dining_areas_del', 'auth_write_dining_areas_upd'],
  dining_tables: ['auth_write_dining_tables', 'auth_write_dining_tables_del', 'auth_write_dining_tables_upd'],
  orders: ['auth_write_orders', 'auth_write_orders_del', 'auth_write_orders_upd'],
  order_items: ['auth_write_order_items', 'auth_write_order_items_del', 'auth_write_order_items_upd'],
  branch_settings: ['auth_write_branch_settings', 'auth_write_branch_settings_del', 'auth_write_branch_settings_upd'],
  order_kitchen_sends: ['auth_write_order_kitchen_sends', 'auth_write_order_kitchen_sends_del', 'auth_write_order_kitchen_sends_upd'],
  waste_entries: ['we_admin_all', 'we_branch_read'],
};

const lines = sql.split('\n');
const result = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // When we see CREATE POLICY for a table with stale policies,
  // inject DROP statements before it
  const createMatch = line.match(/^\s*CREATE POLICY\s+["']?(\w+)["']?\s+ON\s+(?:public\.)?(\w+)/i);
  if (createMatch) {
    const [, policyName, table] = createMatch;
    if (stalePolicies[table]) {
      const stale = stalePolicies[table];
      // Only drop stale policies that are NOT our new auth_* names
      for (const staleName of stale) {
        result.push(`DROP POLICY IF EXISTS ${staleName} ON public.${table};`);
      }
      // Remove this table from the map so we only inject once (at the first CREATE)
      delete stalePolicies[table];
    }
  }
  
  result.push(line);
}

fs.writeFileSync(file, result.join('\n'), 'utf8');
console.log('Migration file updated with stale policy drops');
