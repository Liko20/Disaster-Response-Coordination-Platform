require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../.env"),
});

const { Client } = require("pg");

const client = new Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function createTables() {
  try {
    await client.connect();
    console.log("Connected to database");

    const query = `
        -- Enable PostGIS extension
        CREATE EXTENSION IF NOT EXISTS postgis;
  
        -- disasters table
        CREATE TABLE IF NOT EXISTS disasters (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          location_name TEXT,
          location GEOGRAPHY(Point, 4326),
          description TEXT,
          tags TEXT[],
          owner_id UUID NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          audit_trail JSONB
        );
  
        CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST(location);
        CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN(tags);
        CREATE INDEX IF NOT EXISTS disasters_owner_id_idx ON disasters(owner_id);
  
        -- reports table
        CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          content TEXT,
          image_url TEXT,
          verification_status TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
  
        -- resources table
        CREATE TABLE IF NOT EXISTS resources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
          name TEXT,
          location_name TEXT,
          location GEOGRAPHY(Point, 4326),
          type TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
  
        CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST(location);
  
        -- cache table
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value JSONB,
          expires_at TIMESTAMPTZ
        );
      `;

    await client.query(query);
    console.log("All tables created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err.message);
  } finally {
    await client.end();
    console.log("Disconnected from database.");
  }
}

createTables();
