import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hotfbncvtkdjkkgpvfor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGZibmN2dGtkamtrZ3B2Zm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzcyMzcsImV4cCI6MjEwMjUxMzIzN30.Fn9zEdCqDnZbpB-xqkvM6fiPJKA-yzD8WIimowhOYdg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: rows } = await supabase.from('raw_data').select('*').limit(5);
  
  const rawInserts = [{ loc_code: 'BMT-CO', vendor_code: 'VD0000192', item_no: 'Bắp' }];
  const { data, error } = await supabase.from('raw_data').insert(rawInserts);
  console.log('Result error:', error);
  
  const { count } = await supabase.from('raw_data').select('*', { count: 'exact', head: true });
  console.log('Total count:', count);
}

test();
