/**
 * Verification harness for LangGraph analysis.
 * Usage: npx tsx --env-file=.env scripts/test-langgraph.ts [runLabel]
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAnalysisGraph } from "../src/lib/agents.graph";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const label = process.argv[2] || "run1";

if (!process.env.TAVILY_API_KEY) {
  console.error("TAVILY_API_KEY missing — set it in .env before running");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY missing — set it in .env before running");
  process.exit(1);
}

const input = {
  vcName: "Acme Ventures",
  company: "Billow AI Labs",
  founder: "Joanathan McIntosh",
  url: "https://thebillow.ai",
  deckText: "",
  thesis: {
    sectors: ["AI infra", "Fintech"],
    stage: "Seed",
    geography: "US, Remote-first",
    checkMin: 50,
    checkMax: 250,
    ownership: 8,
    risk: "Balanced",
  },
};

console.log(`=== ${label}: LangGraph analysis for Billow AI Labs ===\n`);
const started = Date.now();
const result = await runAnalysisGraph(input);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`Done in ${elapsed}s\n`);

const checks: string[] = [];
const okHits = result.tavilyRuns.filter((r) => r.ok && r.results.length > 0).length;
const failHits = result.tavilyRuns.filter((r) => !r.ok).length;
checks.push(`tavily ok-with-hits=${okHits} fail=${failHits} total=${result.tavilyRuns.length}`);
checks.push(`axes present=${!!(result.assessment?.axes?.founder && result.assessment?.axes?.market && result.assessment?.axes?.ideaVsMarket)}`);
checks.push(
  `axes scores separate F=${result.assessment?.axes?.founder?.score} M=${result.assessment?.axes?.market?.score} I=${result.assessment?.axes?.ideaVsMarket?.score}`,
);
checks.push(`memory sufficient=${result.memory.sufficient} chunks=${result.memory.ragChunks} topSim=${result.memory.topSimilarity.toFixed(3)}`);
checks.push(`mode from trace: ${result.trace.find((t) => t.step.startsWith("mode:"))?.step ?? "missing"}`);
checks.push(`founderScoreHistory=${JSON.stringify(result.founderScoreHistory)} prior=${result.priorFounderScore}`);
checks.push(`trace length=${result.trace.length}`);

const requiredTracePrefixes = [
  ["memory", "recall"],
  ["memory", "decision:"],
  ["sourcing", "start"],
  ["sourcing", "mode:"],
  ["sourcing", "done"],
  ["memory", "condense"],
  ["assessment", "start"],
  ["assessment", "done"],
];
for (const [agent, stepPrefix] of requiredTracePrefixes) {
  const hit = result.trace.some((t) => t.agent === agent && t.step.startsWith(stepPrefix));
  checks.push(`trace ${agent}/${stepPrefix}* → ${hit ? "OK" : "MISSING"}`);
}

console.log("=== TRACE ===");
for (const t of result.trace) {
  console.log(`[${t.agent}] ${t.step}${t.detail ? " — " + t.detail : ""}`);
}

console.log("\n=== CHECKS ===");
for (const c of checks) console.log("- " + c);

console.log("\n=== TAVILY (summary) ===");
for (const r of result.tavilyRuns) {
  if (r.ok) console.log(`OK  ${r.results.length} hits · ${r.query}`);
  else console.log(`ERR ${r.error} · ${r.query}`);
}

console.log("\n=== ASSESSMENT AXES ===");
console.log(JSON.stringify(result.assessment?.axes, null, 2));
console.log("\n=== RECOMMENDATION ===", result.assessment?.recommendation);
console.log("=== COLD START ===", JSON.stringify(result.coldStart));

const outPath = resolve(root, `scripts/test-langgraph-${label}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      elapsed,
      checks,
      trace: result.trace,
      memory: result.memory,
      coldStart: result.coldStart,
      founderScoreHistory: result.founderScoreHistory,
      priorFounderScore: result.priorFounderScore,
      tavilyRuns: result.tavilyRuns,
      assessment: result.assessment,
      sourcingRaw: result.sourcingRaw.slice(0, 3000),
    },
    null,
    2,
  ),
);
console.log(`\nWrote ${outPath}`);
