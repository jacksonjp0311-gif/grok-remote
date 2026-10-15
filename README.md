# Grok Remote

> **Unofficial.** This is an independent open-source project. Not affiliated with, endorsed by, or sponsored by xAI. “Grok” is a trademark of xAI. If they ask us to change the name, we will.

**The phone is the control plane. The desktop is the runtime.**

One relay. One plugin. One connector. Steer Grok Build from any device with the Grok app while the agent runs on your machine.

```
┌────────────────────────────────────────────────┐
│  G R O K   R E M O T E                          │
│  remaining distance to unsupervised agents      │
│                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                              │
│  approve · deny · queue · audit                  │
└────────────────────────────────────────────────┘
```

---

## The idea

Agents that run unsupervised are not the problem. Agents that run unsupervised without a governance surface are. The gap between "cool demo" and "I trust this with my machine" is the approval layer — the place where a human can see the exact command, decide, and have that decision recorded.

Grok Remote is that layer. It sits between the Grok app on any device and the Grok Build CLI on your desktop. Every tool call the agent makes is gated by a hook that fires inside the live process. The hook posts the call to a relay. The relay holds it. The phone answers. The hook reads the decision and allows or denies. Fail-open at five seconds so a dead relay never stalls the agent — every slipped call lands in the audit log.

This is not a shipped xAI feature. It is assembled from open pieces: hooks that fire inside the TUI, an MCP connector that reaches any device with the Grok app, and a relay that both sides dial. The interconnectivity is the point — the phone is the control plane, the desktop is the runtime, and the relay is the single shared surface between them.

---

## Architecture

```
┌─────────────┐         ┌─────────────────────────────┐         ┌─────────────┐
│   Phone    │         │         Relay           │         │  Desktop  │
│  Grok app  │ ◄─────► │  HTTPS · token auth    │ ◄─────► │  Grok     │
│  any device│         │  approval queue       │         │  Build    │
│           │         │  prompt queue         │         │  + plugin │
│           │         │  audit log            │         │           │
└─────────────┘         └─────────────────────────────┘         └─────────────┘
```

| Layer | Role |
|-------|------|
| **Phone** | Control plane. Calls connector tools: approve, deny, queue prompt, get status. Works on any device with the Grok app. |
| **Relay** | The pipe. HTTPS endpoint, one approval queue, one audit log. Both sides dial it; nothing opens inbound. |
| **Desktop** | Runtime. Grok Build with the plugin. Hooks fire inside the live TUI. |

**Hooks:**

- `PreToolUse` — gates every tool call. Posts to relay, waits for decision, allows or denies.
- `Stop` — holds the agent at turn boundaries and drains the prompt queue.
- `PostToolUse` — appends relay context so mid-session instructions land in the next turn.

**Fail-open:** five-second timeout. A dead relay never stalls the agent. Every slipped call is logged.

---

## Directory

```
grok-remote/
├── relay/           # the server
│   └── server.js     # HTTPS endpoint, queues, audit log
├── plugin/          # Grok Build plugin
│   ├── hooks/
│   │   └── hooks.json # PreToolUse, PostToolUse, Stop
│   └── mcp/
│       └── server.js # local MCP: approve, deny, queue_prompt, get_status
├── connector/       # grok.com connector manifest
│   └── manifest.json
├── install.sh       # the front door
└── README.md
```

---

## Install

```bash
git clone https://github.com/jacksonjp0311-gif/grok-remote.git
cd grok-remote
chmod +x install.sh
./install.sh
```

The script:

1. Checks for Node.js
2. Drops the plugin into `~/.grok/plugins/grok-remote/`
3. Registers the hooks
4. Prints the relay URL
5. Walks you through the two manual steps

**After install:**

1. Start the relay: `node relay/server.js`
2. Add the URL at [grok.com/connectors](https://grok.com/connectors) → New Connector → Custom
3. Open Grok Build. The plugin loads automatically.

---

## If something breaks

| Symptom | Fix |
|---------|-----|
| Hooks not firing | Run `grok plugin list` — confirm grok-remote is installed and trusted. Run `/hooks-trust` if prompted. |
| Relay unreachable from phone | The URL must be public HTTPS. Use a tunnel (ngrok, Cloudflare) if running locally. |
| Connector option missing | Custom connectors are a paid-tier feature. On free, wire the MCP server directly in the CLI: `grok mcp add --transport http grok-remote http://localhost:3001/mcp` |
| Fail-open logging everything | The relay is down. Start it, or check the URL in the plugin config. |

---

## The theory

Interconnectivity between phone and desktop should not require a phone app, a VPN, or an open port. The phone already has the Grok app. The desktop already has Grok Build. The missing piece is a shared surface both can reach — a relay that holds state, queues decisions, and records everything.

Hooks are the gate because they fire inside the live process. MCP is the door because it works on any device with the Grok app. The relay is the room where they meet. Fail-open is the safety valve — the system degrades to "agent runs, human reviews later" instead of "agent stalls forever."

This is the shape of governed continuation: the agent proposes, the human decides, the decision is recorded. The phone is just the nearest surface where that decision can happen.

---

## License

MIT
