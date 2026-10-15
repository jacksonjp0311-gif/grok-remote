#!/usr/bin/env node
/**
 * Stop hook — drains the prompt queue at turn boundaries.
 * If a prompt is queued, block the stop and feed it as context.
 */

const http = require("http");
const RELAY = process.env.RELAY_URL || "http://localhost:3001";
const TOKEN = process.env.RELAY_TOKEN || "dev-token";

const req = http.request(
  `${RELAY}/drain`,
  {
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      try {
        const { prompts } = JSON.parse(body);
        if (prompts && prompts.length > 0) {
          const text = prompts.map((p) => p.text).join("\n");
          process.stdout.write(
            JSON.stringify({
              decision: "block",
              reason: `phone queued: ${text}`,
            })
          );
          process.exit(2);
        }
      } catch (_) {}
      process.exit(0);
    });
  }
);

req.on("error", () => process.exit(0));
req.setTimeout(3000, () => {
  req.destroy();
  process.exit(0);
});
req.end();
