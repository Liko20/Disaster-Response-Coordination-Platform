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

const sql = `
  create or replace function get_nearby_resources(
    disaster_uuid uuid,
    target_point geography,
    radius integer
  )
  returns setof resources
  language sql
  as $$
    select *
    from resources
    where disaster_id = disaster_uuid
    and ST_DWithin(location, target_point, radius);
  $$;
`;

async function createFunction() {
  try {
    await client.connect();
    await client.query(sql);
    console.log("Supabase function 'get_nearby_resources' created.");
  } catch (err) {
    console.error("Error creating function:", err.message);
  } finally {
    await client.end();
  }
}
createFunction();
