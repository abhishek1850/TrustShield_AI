// TrustShield AI - Database Client (PostgreSQL)
// Bank of Baroda Hackathon 2026
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

// Connection config
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trustshield';

let pool: pg.Pool;

console.log('🔌 TrustShield Database: Initializing PostgreSQL Pool...');
pool = new Pool({ connectionString });

// Test connection and run migrations
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ TrustShield Database Connection Error: PostgreSQL connection failed.');
    console.error(`Reason: ${err.message}`);
    console.error('Exiting process as fallback datastore is disabled.');
    process.exit(1);
  }

  console.log('🔌 TrustShield Database: Successfully connected to PostgreSQL.');

  try {
    // Resolve migration schema file path
    let schemaPath = path.join(process.cwd(), '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(process.cwd(), 'database/schema.sql');
    }

    if (fs.existsSync(schemaPath)) {
      console.log('📂 TrustShield Database: Running schema migrations...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('📂 TrustShield Database: Schema migration successfully verified/created.');
    } else {
      console.warn('⚠️ TrustShield Database: schema.sql file not found. Skipping auto-migration.');
    }

    // Check if the users table is empty to apply seeds
    const userCountResult = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userCountResult.rows[0].count, 10);
    
    if (userCount === 0) {
      console.log('🌱 TrustShield Database: Users table is empty. Running database seed...');
      let seedPath = path.join(process.cwd(), '../database/seed.sql');
      if (!fs.existsSync(seedPath)) {
        seedPath = path.join(process.cwd(), 'database/seed.sql');
      }

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await client.query(seedSql);
        console.log('🌱 TrustShield Database: Seed data loaded successfully.');
      } else {
        console.warn('⚠️ TrustShield Database: seed.sql file not found. Skipping seeding.');
      }
    } else {
      console.log(`🔌 TrustShield Database: Database already seeded (found ${userCount} users).`);
    }
  } catch (dbInitErr) {
    console.error('❌ TrustShield Database Initialization Error: ', dbInitErr);
    process.exit(1);
  } finally {
    release();
  }
});

// Interface for Database interactions
export const db = {
  async query(text: string, params: any[] = []): Promise<any> {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('Postgres Query Error: ', err);
      throw err;
    }
  }
};
