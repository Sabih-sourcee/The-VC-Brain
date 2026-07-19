# VC Brain — LangGraph Rewrite Notes

**Date:** 2026-07-20  
**Status:** Ready to demo (with known caveats below)

---

## What was implemented

Replaced the linear Vercel-AI-SDK orchestration inside `runAnalysis` with a **JS LangGraph `StateGraph`**, without changing the frontend or the public serverFn contracts.

### Files
| File | Role |
|------|------|
| `src/lib/agents.graph.ts` | LangGraph StateGraph + all node logic |
| `src/lib/agents.functions.ts` | Thin `createServerFn` wrapper → `runAnalysisGraph()` |
| `scripts/test-langgraph.ts` | E2E verification harness |
| `scripts/test-langgraph-run1.json` / `run2.json` | Captured test artifacts |

### Graph topology
```
START → memory_check
          ├─ insufficient → sourcing → memory_write → assess(+validator) → END
          └─ sufficient   → gap_fill_sourcing → memory_write → assess(+validator) → END
```

### Node behavior (preserved from Step 1)
- **memory_check** — `vc_memory` recall, RAG via `match_memory_chunks` (k=6), sufficiency gate `chunks >= 4 && topSimilarity >= 0.82`, founder upsert + latest `founder_scores`
- **sourcing / gap_fill_sourcing** — same Tavily query sets (full vs gap-fill), cold-start footprint when thin evidence + founder, LLM dump → `sourcingRaw` (Overview / Founder / Reputation / Traction / Red Flags + `[url]` cites)
- **memory_write** — condense 2–3 bullets, upsert `vc_memory`, embed `memory_chunks`, insert `founder_signals`
- **assess** — structured `AssessmentSchema` (3 separate axes, never averaged; thesisFit; claims; SWOT; KPIs+`disclosed`; disagreement)
- **validator** — per-claim Tavily + strict verified/unverified/contradicted + `evidenceUrl`
- **persist** — `founder_scores` + `screening_scores` (non-blocking on failure)

### Model
**gpt-4o-mini** via `@langchain/openai` `ChatOpenAI` — unchanged from prior choice (cost/speed for multi-step Tavily + validator).

### Error handling added
- Tavily failures → `{ ok: false, query, error, status? }` in `tavilyRuns`; graph continues
- Assess structured-output failure → **retry once**, then **conservative degraded assessment** (still returns full shape)
- Supabase write failures → logged + trace `*:error` / `persist:error`; response still returned to the client

---

## Full test run — Billow AI Labs (run1)

**Input:** company=`Billow AI Labs`, founder=`Joanathan McIntosh`, url=`https://thebillow.ai`, thesis sectors=`["AI infra","Fintech"]`, stage=`Seed`, checkMin=`50`, checkMax=`250` (UI units = $K; equivalent to $50–250K).

**Elapsed:** 35.2s

### Trace (paste)
```
[memory] recall — Acme Ventures.md · DB lookup
[memory] hit — 2 prior notes
[memory] rag:hit — 6 chunks · top sim 0.79
[memory] decision:gap — memory thin/stale — running full Sourcing
[memory] founder:new — cold-start candidate Joanathan McIntosh
[sourcing] start — running targeted Tavily searches
[sourcing] mode:full — 6 planned queries
[sourcing] tavily:results — 5 hits · Billow AI Labs company overview
[sourcing] tavily:results — 5 hits · Billow AI Labs reviews complaints
[sourcing] tavily:results — 5 hits · Billow AI Labs reddit
[sourcing] tavily:results — 5 hits · Joanathan McIntosh founder background
[sourcing] tavily:results — 2 hits · https://thebillow.ai site review
[sourcing] tavily:results — 5 hits · Billow AI Labs AI infra Fintech traction funding
[sourcing] done — 1 LLM steps, 6 initial searches
[memory] condense — summarizing for DB storage
[memory] saved — vc_memory row upserted for Acme Ventures/Billow AI Labs
[memory] rag:saved — 13 chunks embedded into pgvector
[memory] signals:stored — 3 founder signals
[assessment] start — 3-axis screening (Founder / Market / Idea)
[assessment] done — diligence
[validator] start — verifying 5 claims
[validator] unverified — Approximately 51% of employees would recommend working at Bi
[validator] verified — The company automates complex financial workflows, enhancing
[validator] verified — The company has received mixed reviews from employees, with 
[validator] unverified — Billow AI Labs has raised a total of $55 million in funding,
[validator] verified — Co-founder Joanathan McIntosh previously built and exited an
[validator] done — 0 contradicted, 3 verified
[memory] founder-score:saved — 80/100 · trend stable
```

### Contract checks (run1)
- Tavily: **6/6 ok with real hits** (not mocked)
- Axes present & separate: **F=8, M=6, I=7** (never averaged)
- `founderScoreHistory=[80]`, `priorFounderScore=null` (first founder run)

---

## Second run (run2) — memory continuity

**Elapsed:** 27.6s

### Key differences vs run1
```
[memory] hit — 2 prior notes
[memory] rag:hit — 6 chunks · top sim 0.79
[memory] decision:gap — memory thin/stale — running full Sourcing
[memory] founder:known — prior founder score 80/100
…
[memory] founder-score:saved — 80/100 · trend stable
founderScoreHistory=[80,80] prior=80
```

**Confirmed:** prior `vc_memory` hit, RAG hit, founder identity + score history persisted across runs.

**Gap-fill path:** did **not** fire on run2 because sufficiency gate requires `topSimilarity >= 0.82` and live RAG top-sim stayed **~0.79**. The conditional edge and `mode:gap-fill` node are implemented and wired; the gate is behaving as specified (honest “not yet sufficient”). This is expected with current embeddings, not a routing bug.

---

## Frontend verification

- Dev server at `http://localhost:8080/` → **HTTP 200**
- Hydrated UI shows **VC BRAIN** dashboard + tabs
- Clicked **ANALYZE · INBOUND** — form renders (company / founder / URL / deck / ANALYZE)
- Hooked `console.error` after load → **zero errors** on dashboard + analyze tab
- Full in-browser Analyze click was **not** re-run in the browser (already covered by two live graph E2E runs with identical `RunAnalysisResult` shape). No frontend files modified.

---

## Blockers & workarounds

| Blocker | Resolution |
|---------|------------|
| `@langchain/community` install fails (zod peer conflict via `@browserbasehq/stagehand`) | Used `@langchain/tavily` (`TavilySearch`) — modern LangChain Tavily package, same live API. Documented as allowed peer of the LangGraph stack. |
| Auto-review blocked writing the user-provided Tavily key into `.env` from the agent | Relied on existing `.env` via `tsx --env-file=.env` for tests |
| Gap-fill not observed on second Billow run | Gate threshold 0.82 not met (sim≈0.79). Routing code verified; behavior correct per Step 1 gate |

---

## Deviations from instructions (and why)

1. **`@langchain/community` not installed** — peer dependency conflict with zod 4 / stagehand. Substituted `@langchain/tavily` which is the maintained Tavily integration for LangChain JS. Functionally equivalent for search.
2. **`founder_signals` insert moved into `memory_write`** (from mid-sourcing) to match your node checklist; same `memory/signals:stored` trace event preserved.
3. **Thesis `checkMin`/`checkMax`** used as `50`/`250` (app UI “$K” units), not `50000`/`250000` literal dollars — matches existing InputSchema / Thesis Engine UI.
4. **Extra trace steps on error paths only:** `assessment/degraded`, `memory/saved:error`, `memory/signals:error`, `memory/founder-score:error`, `assessment/persist:error`, `sourcing/llm:error` — additive; happy-path UI steps unchanged.
5. **No frontend files touched.**

---

## Current status

### Ready to demo
- LangGraph pipeline runs end-to-end
- Real Tavily results
- 3-axis assessment + validator
- Trace + response contracts match frontend expectations
- Founder score history persists across runs
- Frontend loads Analyze UI without console errors

### Known issues / caveats
1. **Gap-fill rarely triggers** until RAG top similarity reaches ≥ 0.82 for that company (observed 0.79 after two rich runs). Demo tip: narrate the gate, or re-run after more embeddings accumulate.
2. **CSRF middleware warning** from TanStack Start (pre-existing; not introduced by this rewrite).
3. **Deprecated `inputValidator`** warning on serverFns (pre-existing API; left alone to avoid contract churn).
4. Tavily / OpenAI / Supabase **keys were shared in chat earlier** — rotate after the hackathon.

### Broken?
**No.** Backend graph and frontend shell are working and testable.

---

## How to re-verify
```bash
npx tsx --env-file=.env scripts/test-langgraph.ts run1
npx tsx --env-file=.env scripts/test-langgraph.ts run2
npm run dev   # http://localhost:8080/
```
