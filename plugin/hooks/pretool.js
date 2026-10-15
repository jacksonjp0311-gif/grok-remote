#!/usr/bin/env node
/**
 * PreToolUse hook — gates every tool call.
 * Posts to relay, waits for decision, allows or denies.
 * Fail-open at five seconds.
 */

const http = require("http");
const RELAY = process.env.RELAY_URL || "http://localhost:3001";
const TOKEN = process.env.RELAY_TOKEN || "dev-token";

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const event = JSON.parse(input);
  const payload = JSON.stringify({
    toolName: event.toolName,
    toolInput: event.toolInput,
    sessionId: event.sessionId,
  });

  const req = http.request(
    `${RELAY}/tool_call`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
    (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const { decision } = JSON.parse(body);
          if (decision === "deny") {
            process.stdout.write(
              JSON.stringify({ decision: "deny", reason: "denied by phone" })
            );
            process.exit(2);
          }
        } catch (_) {}
        process.exit(0);
      });
    }
  );

  req.on("error", () => process.exit(0));
  req.setTimeout(5000, () => {
    req.destroy();
    process.exit(0);
  });
  req.write(payload);
  req.end();
});
