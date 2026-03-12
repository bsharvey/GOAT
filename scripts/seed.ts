/**
 * JARVIS Seed Script — Populate the system with real data.
 *
 * Usage:
 *   npx tsx scripts/seed.ts [command]
 *
 * Commands:
 *   dsrs      — Seed DSR records from docs/decisions/ markdown files
 *   signals   — Seed emotional signals across multiple channels
 *   council   — Trigger a council deliberation
 *   kernel    — Start the AutonomyKernel
 *   all       — Run everything
 */

const API_URL = process.env.API_URL ?? "https://jarvis-api-gateway-production.ben-c1f.workers.dev";
const TOKEN = process.env.AUTH_TOKEN ?? process.env.JARVIS_TOKEN ?? "";

if (!TOKEN) {
  console.error("ERROR: Set AUTH_TOKEN or JARVIS_TOKEN environment variable");
  process.exit(1);
}

async function api(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...options.headers,
    },
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

// --- Seed DSRs ---
async function seedDsrs() {
  console.log("\n=== Seeding DSRs ===");
  const fs = await import("fs");
  const path = await import("path");

  const decisionsDir = path.resolve(import.meta.dirname, "../docs/decisions");
  const files = fs.readdirSync(decisionsDir).filter((f: string) => f.startsWith("DSR-") && f.endsWith(".md"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(decisionsDir, file), "utf-8");

    // Parse markdown
    const titleMatch = content.match(/^#\s+(.+)/m);
    const statusMatch = content.match(/\*\*Status\*\*\s*\|\s*`?(\w+)`?/);
    const alignmentMatch = content.match(/\*\*Alignment\*\*\s*\|\s*(\w+)/);
    const questionMatch = content.match(/## Question\n\n(.+?)(?=\n\n##)/s);
    const tagsMatch = content.match(/\*\*Tags\*\*\s*\|\s*(.+)/);

    const title = titleMatch?.[1] ?? file.replace(".md", "");
    const status = statusMatch?.[1] ?? "decided";
    const question = questionMatch?.[1]?.trim() ?? title;
    const alignment = alignmentMatch?.[1] ?? "aligned";
    const tags = tagsMatch?.[1]?.split(",").map((t: string) => t.trim()) ?? [];

    // Extract synthesis from ## Synthesis section or ## Decision
    const synthesisMatch = content.match(/## (?:Synthesis|Decision)\n\n(.+?)(?=\n\n##|$)/s);
    const synthesis = synthesisMatch?.[1]?.trim()?.slice(0, 2000) ?? null;

    const result = await api("/api/decisions", {
      method: "POST",
      body: JSON.stringify({
        title,
        question,
        status,
        synthesis,
        tags: [...tags, "seeded"],
        metadata: { sourceFile: file, alignment },
      }),
    });

    if (result.ok) {
      const dsr = (result.data as { decision: { dsr_number: string } }).decision;
      console.log(`  ✓ ${dsr.dsr_number}: ${title.slice(0, 60)}`);
    } else {
      console.log(`  ✗ ${file}: ${JSON.stringify(result.data)}`);
    }
  }
}

// --- Seed Emotional Signals ---
async function seedSignals() {
  console.log("\n=== Seeding Emotional Signals ===");

  const signals = [
    { channel: "interaction-velocity", valence: 0.7, arousal: 0.6, dominance: 0.5, label: "High engagement" },
    { channel: "interaction-velocity", valence: 0.3, arousal: 0.4, dominance: 0.4, label: "Low engagement" },
    { channel: "language-temperature", valence: 0.8, arousal: 0.7, dominance: 0.6, label: "Passionate tone" },
    { channel: "language-temperature", valence: 0.5, arousal: 0.3, dominance: 0.5, label: "Neutral tone" },
    { channel: "language-temperature", valence: 0.9, arousal: 0.8, dominance: 0.7, label: "Excited discovery" },
    { channel: "creation-patterns", valence: 0.85, arousal: 0.75, dominance: 0.65, label: "Active creation" },
    { channel: "creation-patterns", valence: 0.6, arousal: 0.5, dominance: 0.5, label: "Browsing artifacts" },
    { channel: "creation-patterns", valence: 0.95, arousal: 0.9, dominance: 0.8, label: "Deep flow state" },
    { channel: "interaction-velocity", valence: 0.75, arousal: 0.65, dominance: 0.55, label: "Steady rhythm" },
    { channel: "interaction-velocity", valence: 0.8, arousal: 0.8, dominance: 0.7, label: "Rapid iteration" },
    { channel: "language-temperature", valence: 0.6, arousal: 0.5, dominance: 0.6, label: "Thoughtful reflection" },
    { channel: "creation-patterns", valence: 0.7, arousal: 0.6, dominance: 0.7, label: "Building momentum" },
    { channel: "interaction-velocity", valence: 0.65, arousal: 0.55, dominance: 0.5, label: "Consistent engagement" },
    { channel: "language-temperature", valence: 0.85, arousal: 0.7, dominance: 0.65, label: "Vision articulation" },
    { channel: "creation-patterns", valence: 0.9, arousal: 0.85, dominance: 0.75, label: "Peak creative flow" },
  ];

  for (const signal of signals) {
    const result = await api("/api/emotional/signal", {
      method: "POST",
      body: JSON.stringify({
        channel: signal.channel,
        vad: { valence: signal.valence, arousal: signal.arousal, dominance: signal.dominance },
        label: signal.label,
      }),
    });

    if (result.ok) {
      console.log(`  ✓ ${signal.channel}: ${signal.label}`);
    } else {
      console.log(`  ✗ ${signal.channel}: ${JSON.stringify(result.data)}`);
    }

    // Small delay to create visible timeline
    await new Promise((r) => setTimeout(r, 200));
  }
}

// --- Trigger Council Deliberation ---
async function seedCouncil() {
  console.log("\n=== Triggering Council Deliberation ===");
  console.log("  Question: Should JARVIS prioritize music production features or enterprise pilot readiness?");

  const result = await api("/api/council/deliberate", {
    method: "POST",
    body: JSON.stringify({
      question: "Should JARVIS prioritize music production features or enterprise pilot readiness for the next quarter?",
    }),
  });

  if (result.ok) {
    // SSE stream — read the text response
    console.log("  ✓ Council deliberation started (streaming response received)");
    if (typeof result.data === "string") {
      // Count events
      const events = (result.data as string).split("event: ").length - 1;
      console.log(`  ✓ Received ${events} SSE events`);
    }
  } else {
    console.log(`  ✗ Council failed: ${JSON.stringify(result.data)}`);
  }
}

// --- Start AutonomyKernel ---
async function startKernel() {
  console.log("\n=== Starting AutonomyKernel ===");

  const stateResult = await api("/api/autonomy/state");
  console.log(`  Current state: ${JSON.stringify(stateResult.data)}`);

  const startResult = await api("/api/autonomy/start", { method: "POST" });
  if (startResult.ok) {
    console.log("  ✓ Kernel started");
  } else {
    console.log(`  ✗ Start failed: ${JSON.stringify(startResult.data)}`);
  }

  // Trigger a few cycles
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const triggerResult = await api("/api/autonomy/trigger", { method: "POST" });
    if (triggerResult.ok) {
      console.log(`  ✓ Cycle ${i + 1} triggered`);
    } else {
      console.log(`  ✗ Trigger ${i + 1} failed: ${JSON.stringify(triggerResult.data)}`);
    }
  }
}

// --- Main ---
async function main() {
  const command = process.argv[2] ?? "all";
  console.log(`JARVIS Seed — API: ${API_URL}`);
  console.log(`Command: ${command}`);

  switch (command) {
    case "dsrs":
      await seedDsrs();
      break;
    case "signals":
      await seedSignals();
      break;
    case "council":
      await seedCouncil();
      break;
    case "kernel":
      await startKernel();
      break;
    case "all":
      await seedDsrs();
      await seedSignals();
      await startKernel();
      // Council last — takes longest due to OpenAI calls + TTS generation
      await seedCouncil();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Valid: dsrs, signals, council, kernel, all");
      process.exit(1);
  }

  console.log("\n✓ Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
