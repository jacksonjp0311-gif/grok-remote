#!/usr/bin/env node
/**
 * PostToolUse hook — appends relay context to the model.
 */

const http = require("http");
const RELAY = process.env.RELAY_URL || "http://localhost:3001";
const TOKEN = process.env.RELAY_TOKEN || "dev-token";

const req = http.request(
  `${RELAY}/status`,
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
              hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: `phone note: ${text}`,
              },
            })
          );
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
