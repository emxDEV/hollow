import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Try calling common SQL execution RPC names
  const rpcs = ['exec_sql', 'run_sql', 'sql', 'query', 'execute_sql'];
  for (const rpc of rpcs) {
    console.log(`Testing RPC: ${rpc}...`);
    try {
      const { data, error } = await supabase.rpc(rpc, { query: 'SELECT 1;' });
      if (error) {
        console.log(`RPC ${rpc} returned error:`, error.message);
      } else {
        console.log(`RPC ${rpc} succeeded! Result:`, data);
      }
    } catch (e) {
      console.log(`RPC ${rpc} exception:`, e.message);
    }
  }
}

check();
