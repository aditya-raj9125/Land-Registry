import { ethers } from 'ethers';
import { Client } from 'pg';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runHealthCheck() {
  console.log('\n═══════════════════════════════════════════');
  console.log('      BhoomiChain System Health Check');
  console.log('═══════════════════════════════════════════\n');

  let overallHealthy = true;

  // ── 1. Blockchain Check ───────────────────────────────────────────
  try {
    const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
    const network = await provider.getNetwork();
    
    // Check balance using the private key from .env
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    const balance = await provider.getBalance(wallet.address);
    
    console.log(`[🔗 Blockchain] Network: ${network.name} (ID: ${network.chainId})`);
    console.log(`[🔗 Blockchain] Deployer Address: ${wallet.address}`);
    console.log(`[🔗 Blockchain] Balance: ${ethers.formatEther(balance)} ETH`);
    console.log('   ✅ Connection stable\n');
  } catch (err: any) {
    console.error('   ❌ Blockchain Error:', err.message);
    overallHealthy = false;
  }

  // ── 2. Database Check ─────────────────────────────────────────────
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`[🐘 Database] Connected to: ${res.rows[0].current_database}`);
    console.log(`[🐘 Database] User: ${res.rows[0].current_user}`);
    console.log(`[🐘 Database] Tables found: ${tables.rowCount}`);
    
    const requiredTables = ['parcels', 'transactions', 'officers', 'disputes'];
    const missingTables = requiredTables.filter(rt => !tables.rows.some(t => t.table_name === rt));
    
    if (missingTables.length > 0) {
      console.warn(`   ⚠️  Missing Tables: ${missingTables.join(', ')}`);
      overallHealthy = false;
    } else {
      console.log('   ✅ Schema intact\n');
    }
  } catch (err: any) {
    console.error('   ❌ Database Error:', err.message);
    overallHealthy = false;
  } finally {
    await client.end();
  }

  // ── 3. Redis Check ────────────────────────────────────────────────
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1
  });
  try {
    const redisStatus = await redis.ping();
    console.log(`[🔴 Redis] Status: ${redisStatus}`);
    console.log('   ✅ Connection stable\n');
  } catch (err: any) {
    console.error('   ❌ Redis Error:', err.message);
    overallHealthy = false;
  } finally {
    redis.disconnect();
  }

  // ── 4. API Server Check ───────────────────────────────────────────
  try {
    const apiPort = process.env.API_PORT || 4000;
    const response = await fetch(`http://localhost:${apiPort}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`[🚀 API Server] Status: ${data.status}`);
      console.log(`[🚀 API Server] Version: ${data.version}`);
      console.log('   ✅ Server responding\n');
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (err: any) {
    console.error(`   ❌ API Error: Could not reach server on port ${process.env.API_PORT || 4000}. Is it running?`);
    overallHealthy = false;
  }

  console.log('═══════════════════════════════════════════');
  if (overallHealthy) {
    console.log('  🎉 SYSTEM STATUS: 100% HEALTHY');
  } else {
    console.log('  ⚠️  SYSTEM STATUS: ISSUES DETECTED');
  }
  console.log('═══════════════════════════════════════════\n');
  
  process.exit(overallHealthy ? 0 : 1);
}

runHealthCheck();
