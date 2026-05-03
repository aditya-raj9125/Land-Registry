import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load env from root
dotenv.config({ path: '../../.env' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const schemaPath = join(__dirname, '../src/db/schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');

    console.log('Applying schema.sql...');
    // Split by semicolon but be careful with functions/triggers
    // For simplicity, we run the whole block. 
    // pg-native or certain drivers handle multiple statements better, 
    // but standard 'pg' .query() can run multiple statements if they are separated by ;
    await client.query(sql);

    console.log('✅ Schema applied successfully');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    if (err.message.includes('database "bhoomichain" does not exist')) {
      console.log('TIP: You must create the database "bhoomichain" first in pgAdmin or psql.');
    }
  } finally {
    await client.end();
  }
}

migrate();
