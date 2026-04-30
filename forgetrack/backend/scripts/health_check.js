const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function pingDatabase() {
  const client = new Client({ 
    connectionString,
    connectionTimeoutMillis: 30000 // 30 seconds timeout
  });
  
  console.log('--- Database Health Check ---');
  console.log(`Target: db.lywfynijjbkcgifjkhux.supabase.co`);
  
  const startTime = Date.now();
  
  try {
    await client.connect();
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connection established in ${connectionTime}ms`);
    
    const res = await client.query('SELECT NOW() as current_time, version();');
    const queryTime = Date.now() - startTime - connectionTime;
    
    console.log(`✅ Query executed in ${queryTime}ms`);
    console.log(`🕒 Server Time: ${res.rows[0].current_time}`);
    console.log(`📦 Postgres Version: ${res.rows[0].version.split(',')[0]}`);
    
    console.log('\n--- Status: HEALTHY ---');
    
  } catch (err) {
    console.error('\n❌ Status: UNHEALTHY');
    console.error(`Error Details: ${err.message}`);
    if (err.code) console.error(`Error Code: ${err.code}`);
  } finally {
    await client.end();
  }
}

pingDatabase();
