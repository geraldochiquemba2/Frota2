import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureAdminExists() {
  try {
    const phone = "+244999999999"; // Normalized number
    const pin = "1234567890";
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (existing.length === 0) {
      await db.insert(usersTable).values({
        name: "Administrador Sistema",
        phone,
        pin,
        role: "admin",
        active: true
      });
      logger.info("Fixed admin user created.");
    } else {
      await db.update(usersTable).set({ pin, role: "admin", active: true }).where(eq(usersTable.phone, phone));
      logger.info("Fixed admin user verified.");
    }
  } catch (err) {
    logger.error({ err }, "Error ensuring fixed admin");
  }
}

function setupKeepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  if (!url) {
    logger.warn("Keep-alive skipped: RENDER_EXTERNAL_URL not set.");
    return;
  }
  
  // Render Free Tier sleeps after 15 mins of inactivity.
  // We'll ping ourselves every 5 minutes with a cache-buster.
  setInterval(() => {
    const pingUrl = `${url.replace(/\/$/, "")}/api/healthz?cb=${Date.now()}`;
    fetch(pingUrl)
      .then(res => {
        if (res.status === 200) logger.info(`Keep-alive success: ${res.status}`);
        else logger.warn(`Keep-alive unexpected status: ${res.status}`);
      })
      .catch(err => logger.error({ err }, "Keep-alive request failed"));
  }, 5 * 60 * 1000); 
  
  logger.info(`Keep-alive aggressive mode (5m) configured for ${url}`);
}

ensureAdminExists().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    setupKeepAlive();
  });
});
