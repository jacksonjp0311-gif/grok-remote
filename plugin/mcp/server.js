#!/usr/bin/env node
/**
 * Local MCP server — exposes approve, deny, queue_prompt, get_status.
 * Wired into Grok Build so the phone connector and the CLI share the same tools.
 */

const http = require("http");
const RELAY = process.env.RELAY_URL || "http://localhost:3001";
const TOKEN = process.env.RELAY_TOKEN || "dev-token";

function relay(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${RELAY}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const tools = {
  approve: async (args) => relay("POST", "/decision", { id: args.id, decision: "allow" }),
  deny: async (args) => relay("POST", "/decision", { id: args.id, decision: "deny" }),
  queue_prompt: async (args) => relay("POST", "/prompt", { text: args.text }),
  get_status: async () => relay("GET", "/status"),
};

process.stdin.setEncoding("utf8");
let buf = "";
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx);
    buf = buf.slice(idx + 1);
    try {
      const msg = JSON.parse(line);
      if (msg.method === "tools/call") {
        const fn = tools[msg.params.name];
        if (fn) {
          fn(msg.params.arguments || {}).then((result) => {
            process.stdout.write(
              JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\n"
            );
          });
        }
      } else if (msg.method === "tools/list") {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: {
              tools: Object.keys(tools).map((name) => ({ name, description: name })),
            },
          }) + "\n"
        );
      } else if (msg.method === "initialize") {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { protocolVersion: "2025-03-26", capabilities: {}, serverInfo: { name: "grok-remote" } },
          }) + "\n"
        );
      }
    } catch (_) {}
  }
});
