const express = require("express");
const router = express.Router();
const supabase = require("../utils/connection/connection");

const SEARCH_RADIUS_METERS = 10000;

router.get("/:id", async (req, res) => {
  const { id: disasterId } = req.params;
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res
      .status(400)
      .json({ error: "Missing 'lat' or 'lon' query parameters" });
  }

  try {
    const { data, error } = await supabase.rpc("get_nearby_resources", {
      disaster_uuid: disasterId,
      target_point: `SRID=4326;POINT(${lon} ${lat})`,
      radius: 10000,
    });
    if (error) {
      console.error("Supabase error:", error.message);
      return res
        .status(500)
        .json({ error: "Failed to fetch nearby resources" });
    }

    res.json(data);
  } catch (err) {
    console.error("GET /:id/resources error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
