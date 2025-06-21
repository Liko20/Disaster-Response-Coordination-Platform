const express = require("express");
const axios = require("axios");
const router = express.Router();
const supabase = require("../utils/connection/connection");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

router.post("/", async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Description is required" });
  }

  const cacheKey = `geocode_${description.toLowerCase().replace(/\s+/g, "_")}`;
  const now = new Date();

  const { data: cached } = await supabase
    .from("cache")
    .select("*")
    .eq("key", cacheKey)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > now) {
    return res.json({ source: "cache", ...cached.value });
  }

  try {
    const geminiResp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Extract the location from this disaster description: "${description}". Respond with only the location name.`,
              },
            ],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const locationName =
      geminiResp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!locationName) {
      return res.status(400).json({ error: "Could not extract location" });
    }

    const geoResp = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: locationName,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "Disaster-Response-App",
        },
      }
    );

    const result = geoResp.data[0];

    if (!result) {
      return res.status(404).json({ error: "Location not found" });
    }

    const response = {
      location_name: locationName,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };

    await supabase.from("cache").upsert({
      key: cacheKey,
      value: response,
      expires_at: new Date(now.getTime() + 60 * 60 * 1000),
    });

    return res.json({ source: "live", ...response });
  } catch (err) {
    console.error("Geocode error:", err.message);
    return res
      .status(500)
      .json({ error: "Failed to extract or geocode location" });
  }
});

module.exports = router;
