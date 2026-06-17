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
  console.log('Inserting test dailyJournal...');
  const { data: journalData, error: journalError } = await supabase
    .from('dailyJournals')
    .insert({ date: '2026-06-15', status: 'COMPLETED' })
    .select();
  
  if (journalError) {
    console.error('Error inserting journal:', journalError);
  } else {
    console.log('dailyJournals columns:', Object.keys(journalData[0]));
    // Clean up
    await supabase.from('dailyJournals').delete().eq('date', '2026-06-15');
  }

  console.log('Inserting test weeklyPlanner...');
  const { data: plannerData, error: plannerError } = await supabase
    .from('weeklyPlanners')
    .insert({ weekId: '2026-W25', status: 'PLANNING' })
    .select();
  
  if (plannerError) {
    console.error('Error inserting planner:', plannerError);
  } else {
    console.log('weeklyPlanners columns:', Object.keys(plannerData[0]));
    // Clean up
    await supabase.from('weeklyPlanners').delete().eq('weekId', '2026-W25');
  }
}

check();
