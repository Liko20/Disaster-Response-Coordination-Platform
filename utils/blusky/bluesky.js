const Atproto = require("@atproto/api");
const { BskyAgent } = Atproto;
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const agent = new BskyAgent({ service: "https://bsky.social" });

async function login() {
  await agent.login({
    identifier: process.env.BSKY_IDENTIFIER,
    password: process.env.BSKY_PASSWORD,
  });
}

async function searchPosts(keyword) {
  const res = await agent.api.app.bsky.feed.searchPosts({
    q: keyword,
    limit: 10,
  });
  return res.data.posts;
}

module.exports = { login, searchPosts, agent };
