import Redis from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy(times) {
    if (times > 5) return null;
    return 400;
  },
};

export const pub = new Redis(redisConfig);
export const sub = new Redis(redisConfig);
export const redisClient = new Redis(redisConfig);

pub.on("connect", () => {
  console.log("Publisher connected");
});

sub.on("connect", () => {
  console.log("Subscriber connected");
});

redisClient.on("connect", () => {
  console.log("REdis Client connected");
});

pub.on("error", (err) => {
  console.log("Publisher error:", err);
});

redisClient.on("error", (err) => {
  console.log("Redis Client error:", err);
});


// Redis Server (Restaurant)
//            │
//     ┌──────┼──────┐
//     │      │      │
//    pub    sub   redisClient