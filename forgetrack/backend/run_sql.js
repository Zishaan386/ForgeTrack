const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Skill60forge@db.lywfynijjbkcgifjkhux.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  
  try {
    console.log("Connecting to the database...");
    await client.connect();

    console.log("Reading schema.sql...");
    const schemaSql = fs.readFileSync(path.join(__dirname, 'supabase', 'schema.sql'), 'utf8');
    
    console.log("Executing schema.sql...");
    await client.query(schemaSql);
    console.log("Schema applied successfully.");

    console.log("Reading seed.sql...");
    const seedSql = fs.readFileSync(path.join(__dirname, 'supabase', 'seed.sql'), 'utf8');
    
    console.log("Executing seed.sql...");
    await client.query(seedSql);
    console.log("Seed data applied successfully.");

  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
