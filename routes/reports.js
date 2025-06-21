const express = require("express");
const router = express.Router();
const { db } = require("../utils/connection/connection");

router.post("/", async (req, res) => {
  const { disaster_id, user_id, content, image_url, verification_status } =
    req.body;

  if (!disaster_id || !user_id || !content) {
    return res
      .status(400)
      .json({ error: "disaster_id, user_id and content are required" });
  }

  try {
    const { data, error } = await db
      .from("reports")
      .insert([
        {
          disaster_id,
          user_id,
          content,
          image_url: image_url || null,
          verification_status: verification_status || "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select("*");

    if (error) throw error;

    req.app.get("io").emit("report_submitted", data[0]);

    res.status(201).json({ success: true, report: data[0] });
  } catch (err) {
    console.error("Error inserting report:", err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

module.exports = router;
