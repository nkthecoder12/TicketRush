import cron from "node-cron";
import { expirationRelease } from "../jobs/expirationRelease.js";

cron.schedule("* * * * *", async () => {
  try {
    const result = await expirationRelease();

    console.log("Expiration worker:", result);
  } catch (error) {
    console.error("Expiration worker error:", error);
  }
});