const axios = require("axios");

async function geocodeLocationName(locationName) {
  if (!locationName || typeof locationName !== "string") {
    throw new Error("Invalid location name: must be a non-empty string");
  }

  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: locationName,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "diaseter-app",
        },
        timeout: 5000,
      }
    );

    if (!response.data.length) {
      console.warn(`No geolocation found for: ${locationName}`);
      return null;
    }

    const { lat, lon } = response.data[0];
    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    };
  } catch (error) {
    console.error("Geocoding API failed:", {
      message: error.message,
      code: error.code || "UNKNOWN",
      response: error.response?.data || null,
    });
    return null;
  }
}

module.exports = { geocodeLocationName };
