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

const url = `${env['VITE_SUPABASE_URL']}/rest/v1/`;
const key = env['VITE_SUPABASE_ANON_KEY'];

async function fetchSchema() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  
  if (data.definitions) {
    console.log('--- accounts columns ---');
    if (data.definitions.accounts) {
      console.log(Object.keys(data.definitions.accounts.properties));
    } else {
      console.log('accounts definition not found');
    }

    console.log('--- trades columns ---');
    if (data.definitions.trades) {
      console.log(Object.keys(data.definitions.trades.properties));
    } else {
      console.log('trades definition not found');
    }
  } else {
    console.log('No definitions in OpenAPI response', data);
  }
}

fetchSchema();
