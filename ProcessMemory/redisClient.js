const { createClient } = require("redis");

const redis = createClient({
  url: "redis://default:Rw38m16pHNike9NlAuRDv7YRzqDVLTAH@redis-11919.c212.ap-south-1-1.ec2.cloud.redislabs.com:11919"
});

redis.on("error", err => console.error("Redis error:", err));
redis.on("connect", () => console.log("Connected to Redis cloud successfully"));

(async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
})();

module.exports = redis;
