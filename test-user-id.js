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
  console.log('Testing custom string for dailyJournals date column...');
  const { error: journalError } = await supabase
    .from('dailyJournals')
    .insert({ date: 'usr-test-123:2026-06-15', status: 'COMPLETED' });
  
  if (journalError) {
    console.log('dailyJournals custom date failed:', journalError.message);
  } else {
    console.log('dailyJournals custom date succeeded!');
    await supabase.from('dailyJournals').delete().eq('date', 'usr-test-123:2026-06-15');
  }

  console.log('Testing custom string for weeklyPlanners weekId column...');
  const { error: plannerError } = await supabase
    .from('weeklyPlanners')
    .insert({ weekId: 'usr-test-123:2026-W25', status: 'PLANNING' });
  
  if (plannerError) {
    console.log('weeklyPlanners custom weekId failed:', plannerError.message);
  } else {
    console.log('weeklyPlanners custom weekId succeeded!');
    await supabase.from('weeklyPlanners').delete().eq('weekId', 'usr-test-123:2026-W25');
  }
}

check();
