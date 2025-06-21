const supabase = require("../connection/connection");

const DISASTER_ID = "492ac525-83df-4ecf-b10b-7ec8667319e1";

const resources = [
  {
    disaster_id: DISASTER_ID,
    name: "Red Cross Shelter",
    location_name: "Lower East Side, NYC",
    type: "shelter",
    location: "SRID=4326;POINT(-73.9876 40.7153)",
  },
  {
    disaster_id: DISASTER_ID,
    name: "Food Distribution Center",
    location_name: "Brooklyn, NYC",
    type: "food",
    location: "SRID=4326;POINT(-73.9442 40.6782)",
  },
  {
    disaster_id: DISASTER_ID,
    name: "Emergency Medical Camp",
    location_name: "Harlem, NYC",
    type: "medical",
    location: "SRID=4326;POINT(-73.9442 40.8116)",
  },
];

async function seedResources() {
  const { data, error } = await supabase
    .from("resources")
    .insert(resources)
    .select();

  if (error) {
    console.error("Error inserting resources:", error.message);
  } else {
    console.log("Resources inserted:", data);
  }
}

seedResources();
