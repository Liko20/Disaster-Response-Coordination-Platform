const axios = require("axios");

async function getSheltersFromOSM(lat, lon, radius = 5000) {
  const query = `
    [out:json];
    node["amenity"="shelter"](around:${radius},${lat},${lon});
    out;
  `;

  const response = await axios.get("https://overpass-api.de/api/interpreter", {
    params: { data: query },
  });

  return response.data.elements.map((el) => ({
    name: el.tags?.name || "Unnamed Shelter",
    lat: el.lat,
    lon: el.lon,
  }));
}
module.exports = {
  getSheltersFromOSM,
};
