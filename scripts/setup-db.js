
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read config from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);

if (!dbUrlMatch) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
}

const connectionString = dbUrlMatch[1];

const client = new Client({
    connectionString: connectionString,
});

async function runSchema() {
    try {
        await client.connect();
        console.log("Connected to Supabase PostgreSQL");

        const schemaPath = path.join(__dirname, '../supabase_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log("Running schema...");
        await client.query(schemaSql);
        console.log("Schema applied successfully!");
    } catch (err) {
        console.error("Error applying schema:", err);
    } finally {
        await client.end();
    }
}

runSchema();
