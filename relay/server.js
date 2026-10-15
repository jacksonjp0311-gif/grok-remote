#!/usr/bin/env node
/**
 * Grok Remote — Relay Server
 * HTTPS endpoint, approval queue, prompt queue, audit log.
 * Both the plugin and the connector dial this.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.RELAY_PORT || 3001;
const TOKEN = process.env.RELAY_TOKEN || "dev-token";
const TIMEOUT_MS = 5000;

const approvals = new Map();
const prompts = [];
const audit = [];

function log(entry) {
  audit.push({ ...entry, ts: new Date().toISOString() });
  if (audit.length > 1000) audit.shift();
}

function auth(req) {
  const h = req.headers.authorization || "";
  return h === `Bearer ${TOKEN}`;
}

const server = http.createServer((req, res) => {
  if (!auth(req)) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const data = body ? JSON.parse(body) : {};

    if (req.method === "POST" && req.url === "/tool_call") {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const call = { id, ...data, status: "pending", decision: null };
      approvals.set(id, call);
      log({ type: "tool_call", id, tool: data.toolName });

      const timer = setTimeout(() => {
        const c = approvals.get(id);
        if (c && c.status === "pending") {
          c.status = "timeout";
          c.decision = "allow";
          log({ type: "timeout", id });
        }
      }, TIMEOUT_MS);

      const check = setInterval(() => {
        const c = approvals.get(id);
        if (c && c.status !== "pending") {
          clearInterval(check);
          clearTimeout(timer);
          res.writeHead(200);
          res.end(JSON.stringify({ decision: c.decision, id }));
        }
      }, 100);
      return;
    }

    if (req.method === "POST" && req.url === "/decision") {
      const c = approvals.get(data.id);
      if (c) {
        c.decision = data.decision;
        c.status = "decided";
        log({ type: "decision", id: data.id, decision: data.decision });
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method === "POST" && req.url === "/prompt") {
      prompts.push({ text: data.text, ts: new Date().toISOString() });
      log({ type: "prompt", text: data.text });
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method === "GET" && req.url === "/status") {
      res.writeHead(200);
      return res.end(
        JSON.stringify({
          pending: [...approvals.values()].filter((c) => c.status === "pending"),
          prompts,
          audit: audit.slice(-20),
        })
      );
    }

    if (req.method === "GET" && req.url === "/drain") {
      const drained = [...prompts];
      prompts.length = 0;
      res.writeHead(200);
      return res.end(JSON.stringify({ prompts: drained }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "not found" }));
  });
});

server.listen(PORT, () => {
  console.log(`relay listening on :${PORT}`);
  console.log(`token: ${TOKEN}`);
});
