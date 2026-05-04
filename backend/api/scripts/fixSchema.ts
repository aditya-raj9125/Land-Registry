import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function fixSchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Fixing schema...');
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS district_code VARCHAR(10);');
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);');
    console.log('✅ Columns added successfully');
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

fixSchema();
