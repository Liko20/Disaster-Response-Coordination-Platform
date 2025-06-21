const express = require("express");
const router = express.Router();
const supabase = require("../utils/connection/connection");
const { geocodeLocationName } = require("../utils/geocoding/geocoding");
const { login, searchPosts } = require("../utils/blusky/bluesky");
const axios = require("axios");
const cheerio = require("cheerio");
const handleError = (res, status, message, details = null) =>
  res.status(status).json({ error: { message, details } });

router.post("/", async (req, res) => {
  try {
    const fields = req.body;

    if (!fields.title || !fields.location_name || !fields.owner_id) {
      return handleError(
        res,
        400,
        "Missing required fields: title, location_name, owner_id"
      );
    }

    const geoLocation = await geocodeLocationName(fields.location_name);
    if (!geoLocation) {
      return handleError(res, 400, "Invalid location_name");
    }

    fields.location = `SRID=4326;POINT(${geoLocation.lon} ${geoLocation.lat})`;

    const { data, error } = await supabase
      .from("disasters")
      .insert([fields])
      .select();

    if (error)
      return handleError(res, 400, "Failed to insert disaster", error.message);

    req.app.get("io").emit("disaster_updated", data[0]);
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("POST /disasters error:", err);
    return handleError(res, 500, "Internal server error", err.message);
  }
});

router.get("/", async (req, res) => {
  try {
    const tag = req.query.tag;
    let query = supabase.from("disasters").select("*");

    if (tag) query = query.contains("tags", [tag]);

    const { data, error } = await query;

    if (error)
      return handleError(res, 500, "Failed to fetch disasters", error.message);
    res.json(data);
  } catch (err) {
    console.error("GET /disasters error:", err);
    return handleError(res, 500, "Internal server error", err.message);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return handleError(res, 400, "Missing disaster ID");

    const { data, error } = await supabase
      .from("disasters")
      .update(req.body)
      .eq("id", id)
      .select();

    if (error)
      return handleError(res, 400, "Failed to update disaster", error.message);

    req.app.get("io").emit("disaster_updated", data[0]);
    res.json(data[0]);
  } catch (err) {
    console.error("PUT /disasters/:id error:", err);
    return handleError(res, 500, "Internal server error", err.message);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return handleError(res, 400, "Missing disaster ID");

    const { error } = await supabase.from("disasters").delete().eq("id", id);
    if (error)
      return handleError(res, 400, "Failed to delete disaster", error.message);

    req.app.get("io").emit("disaster_updated", { id, deleted: true });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /disasters/:id error:", err);
    return handleError(res, 500, "Internal server error", err.message);
  }
});

router.get("/:id/social-media", async (req, res) => {
  const { id } = req.params;
  await login();
  const keyword = `#disaster`;
  const posts = await searchPosts(keyword);
  req.app.get("io").emit("social_media_updated", { disaster_id: id, posts });

  res.json(posts);
});

router.get("/:id/official-updates", async (req, res) => {
  const disasterId = req.params.id;

  const { data: disaster, error: disasterError } = await supabase
    .from("disasters")
    .select("location_name")
    .eq("id", disasterId)
    .single();

  if (disasterError || !disaster) {
    return res.status(404).json({ error: "Disaster not found" });
  }

  const locationName = disaster.location_name;
  const cacheKey = `official_updates_${locationName
    .toLowerCase()
    .replace(/\s+/g, "_")}`;

  const now = new Date();
  const { data: cached } = await supabase
    .from("cache")
    .select("*")
    .eq("key", cacheKey)
    .maybeSingle();

  // if (cached && new Date(cached.expires_at) > now) {
  //   return res.json({ source: "cache", updates: cached.value });
  // }

  try {
    const { data: html } = await axios.get(
      "https://www.redcross.org/about-us/news-and-events/latest-news.html"
    );
    const $ = cheerio.load(html);
    const updates = [];
    $(".page-teaser-wrapper").each((_, el) => {
      const title = $(el).find(".title").text().trim();
      const href = $(el).find("a").attr("href");
      if (title.toLowerCase().includes(locationName.toLowerCase())) {
        updates.push({
          title,
          url: `https://www.redcross.org${href}`,
        });
      }
    });

    await supabase.from("cache").upsert({
      key: cacheKey,
      value: updates,
      expires_at: new Date(now.getTime() + 60 * 60 * 1000),
    });

    return res.json({ source: "live", updates });
  } catch (err) {
    console.error("Scraping error:", err.message);
    return res.status(500).json({ error: "Failed to fetch official updates" });
  }
});

router.post("/:id/verify-image", async (req, res) => {
  const disasterId = req.params.id;
  const { image_url } = req.body;

  if (!image_url) {
    return res.status(400).json({ error: "Image URL is required" });
  }

  try {
    const prompt = `Analyze the image at ${image_url}. Is it authentic and related to a disaster?`;

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseText =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response";

    // Optional: store result in 'reports' table with verification_status = "verified"
    // await supabase.from("reports").update({ verification_status: "verified" }).eq("disaster_id", disasterId)

    res.json({
      status: "verified",
      gemini_result: responseText,
    });
  } catch (err) {
    console.error("Gemini API error:", err.message);
    res.status(500).json({ error: "Failed to verify image" });
  }
});

module.exports = router;
