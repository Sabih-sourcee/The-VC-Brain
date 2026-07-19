
# Plan: VC Brain gaps 1–4

Ship the four highest-impact gaps from the brief on top of the current Tavily-backed pipeline.

## 1. Persistent Founder Score (Memory that never resets)

Right now VC memory lives in an in-memory `Map` — it dies with the worker. The brief says the Founder Score must persist across applications and get sharper with every milestone.

- Enable **Lovable Cloud** (Supabase under the hood).
- Add three tables:
  - `founders` — canonical founder profile: `id`, `name`, `normalized_name`, `linkedin_url`, `github_handle`, `twitter_handle`, `created_at`, `updated_at`.
  - `founder_signals` — append-only event log: `id`, `founder_id`, `source` ("tavily" | "github" | "hn" | "producthunt" | "arxiv" | "linkedin" | "manual"), `signal_type`, `payload` (jsonb), `weight`, `observed_at`. Never delete — trend comes from this table.
  - `founder_scores` — snapshot per scoring run: `id`, `founder_id`, `score` (0–100), `subscores` (jsonb: technical, execution, network, market_insight, resilience), `confidence` (0–1), `computed_at`, `trend` ("improving" | "stable" | "declining"), derived from previous snapshot.
- Add `vc_memory` table replacing the Map: `vc_name`, `topic`, `summary`, `evidence_urls[]`, `updated_at`.
- Migrate `agents.functions.ts` to read/write these tables. Memory Agent now: (a) recall by founder + VC, (b) after sourcing, upsert founder, insert signals, recompute score, save snapshot with trend.

## 2. 3-axis screening — Founder / Market / Idea-vs-Market, NOT averaged

Assess Agent currently returns a flat blob with founderScore / reputationScore / riskScore. The brief is explicit: three independent axes, each with a trend, never collapsed.

- Replace `AssessmentSchema` with:
  - `founder`: `{ score, trend, rationale, evidence[] }` — uses persistent Founder Score as one input, not the whole score.
  - `market`: `{ stance ("bullish" | "neutral" | "bear"), score, trend, tam_note, competitors[], swot }`.
  - `ideaVsMarket`: `{ survivesAsIs (bool), pivotStrength, score, trend, rationale }`.
  - `recommendation` derived from all three, plus explicit `disagreement` field when axes conflict (that's the signal, not noise).
- Store each axis snapshot in a new `screening_scores` table keyed by `(company, vc_name, run_id)` so trend can be computed for the same company on repeat analyses.
- Memo UI: render the three axes as three side-by-side cards (Bloomberg-style), each with score, trend arrow, and evidence — never a combined single number.

## 3. Outbound sourcing — find founders before they apply

New surface in the app: **Sourcing Radar** tab alongside the current inbound intake.

- New server function `scanOutbound({ thesis })` that runs in parallel:
  - **GitHub** (via GitHub connector or unauthenticated search API): trending repos in thesis sectors + repos with high recent-star velocity from accounts with < N followers (early signal).
  - **Hacker News** (Algolia HN API, no auth): "Show HN" and "Launch HN" posts in last 30 days matching sector keywords.
  - **ProductHunt** (Firecrawl on `/topics/<sector>` — no PH connector needed): recent launches.
  - **arXiv** (public API): recent papers in AI sectors, extract first-author names.
  - **Tavily search**: "hackathon winner {sector} 2026", "YC W26 {sector}" style queries.
- Each hit becomes a `founder_signals` row; a lightweight LLM pass extracts founder name/handle and enriches the `founders` table.
- Radar UI: list of candidates ranked by thesis fit + Founder Score, "Analyze" button pipes into the existing memo flow.

## 4. Cold-start scoring — public footprint when there's no track record

For founders with no GitHub, no funding, no press. This is where generic pipelines fail per the brief.

- New agent step `coldStartScorer` that runs when Founder Score confidence is low (< 0.3) or the founder has < 2 signals:
  - Tavily searches for `"{founder name}"` + LinkedIn / Twitter / personal site.
  - Firecrawl scrape on the top LinkedIn/Twitter/portfolio URLs (real page content, not just SERP snippets).
  - LLM extraction against a schema: education, prior roles, projects shipped, writing/thought-leadership, community involvement, evidence of resilience (career jumps, side projects, hackathons).
  - Produce a `cold_start_score` with per-dimension breakdown AND explicit confidence intervals — memo shows both the point score and the uncertainty band. This is the honest-about-uncertainty behavior the brief rewards.
- Feed the cold-start score into the Founder axis (§2) as one input alongside the persistent Founder Score, weighted by confidence.

## Ordering

Ship in this order — each phase leaves the app working:
1. Enable Lovable Cloud + migrations for `founders`, `founder_signals`, `founder_scores`, `vc_memory`, `screening_scores`.
2. Rewrite Memory Agent against the tables. Persistent Founder Score visible in memo.
3. New 3-axis Assess Agent schema + memo UI.
4. Sourcing Radar tab + outbound scanners.
5. Cold-start scorer + confidence bands.

## Technical notes

- Firecrawl (already documented) covers ProductHunt/LinkedIn scrape. Connect it if not linked.
- GitHub connector optional — falls back to unauthenticated public search API (rate-limited but fine for MVP).
- Trend calc: compare current snapshot to previous one for same founder/company; ≥ +10% score = improving, ≤ −10% = declining, else stable.
- All new server functions use the existing `createLovableAiGatewayProvider` on `openai/gpt-5.4-nano` — no new model choices.
- All persistence goes through RLS-protected tables; since VC Brain has no user auth yet, tables use `TO anon` policies scoped by `vc_name`. Add proper auth in a later pass.

## Out of scope for this pass

- Auth / multi-user (uses `vc_name` string as the tenant key for now).
- Validator Agent (stretch #2).
- Multi-attribute NL query.
- Deck ingestion.
- Memo section restructure to the exact Appendix-1 checklist.

Reply with any adjustments; otherwise I'll start with phase 1 (Cloud + migrations).
