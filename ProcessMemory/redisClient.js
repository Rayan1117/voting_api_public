const { createClient } = require("redis");

const redis = createClient({
  url: "redis://127.0.0.1:6379"
});

redis.on("error", err => console.error("Redis error:", err));

(async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
})();

module.exports = redis;
