import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2, AlertTriangle, Flag, Info, TrendingUp, TrendingDown, Minus,
  Loader2, Circle, Search, Radar, LayoutDashboard, FileText, Send, Snowflake,
  Trophy, ShieldAlert, Building2, ArrowRight, Sparkles,
} from "lucide-react";
import { runAnalysis, type RunAnalysisResult } from "@/lib/agents.functions";
import { scanOutbound, type ScanOutboundResult, type OutboundCandidate } from "@/lib/outbound.functions";
import { parseDeck } from "@/lib/deck.functions";
import { searchFounders, type FounderSearchResult } from "@/lib/founders.functions";

export const Route = createFileRoute("/")({
  component: VCBrain,
});

const BRAND = "#DADD98";
const INK = "#000000";
const OK = "#22c55e";
const WARN = "#eab308";
const BAD = "#ef4444";
const MUTED = "#c9ccb0";

const SECTORS = ["AI infra", "Fintech", "Healthtech", "Consumer", "Climate", "Devtools", "Bio"];

type Thesis = {
  sectors: string[];
  stage: string;
  geography: string;
  checkMin: number;
  checkMax: number;
  ownership: number;
  risk: string;
};

const DEFAULT_THESIS: Thesis = {
  sectors: ["AI infra", "Devtools"],
  stage: "Seed",
  geography: "US, Remote-first",
  checkMin: 50,
  checkMax: 250,
  ownership: 8,
  risk: "Balanced",
};

const PIPELINE: { key: string; label: string; agent: string; weight: number }[] = [
  { key: "memory",    label: "Memory · recall VC notes",      agent: "Memory Agent",     weight: 1 },
  { key: "sourcing",  label: "Sourcing · crawl web + Reddit", agent: "Sourcing Agent",   weight: 3 },
  { key: "screening", label: "Screening · 3-axis first pass", agent: "Screening Agent",  weight: 1 },
  { key: "diligence", label: "Diligence · claim verification",agent: "Validator Agent",  weight: 3 },
  { key: "decision",  label: "Decision · assemble memo",      agent: "Assessment Agent", weight: 1 },
];

type DashRow = {
  id: string;
  company: string;
  founder: string;
  vcName: string;
  recommendation: "recommend" | "diligence" | "pass";
  founderScore: number;
  trend: "improving" | "stable" | "declining";
  updatedAt: number;
  sector: string;
  stage: string;
  result: RunAnalysisResult;
  thesis: Thesis;
};

const DASH_KEY = "vcbrain:dashboard:v1";
const THESIS_KEY = "vcbrain:thesis:v1";
const OUTREACH_KEY = "vcbrain:outreach:v1";

function loadDash(): DashRow[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(DASH_KEY) || "[]"); } catch { return []; }
}
function saveDash(rows: DashRow[]) {
  try { localStorage.setItem(DASH_KEY, JSON.stringify(rows.slice(0, 100))); } catch {}
}
function loadThesis(): Thesis {
  if (typeof window === "undefined") return DEFAULT_THESIS;
  try { return { ...DEFAULT_THESIS, ...JSON.parse(localStorage.getItem(THESIS_KEY) || "{}") }; } catch { return DEFAULT_THESIS; }
}
function saveThesis(t: Thesis) {
  try { localStorage.setItem(THESIS_KEY, JSON.stringify(t)); } catch {}
}
function loadOutreach(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(OUTREACH_KEY) || "{}"); } catch { return {}; }
}
function saveOutreach(o: Record<string, number>) {
  try { localStorage.setItem(OUTREACH_KEY, JSON.stringify(o)); } catch {}
}

function thesisFit(row: { sector?: string; stage?: string }, thesis: Thesis): { within: boolean; reason: string } {
  const s = (row.sector || "").toLowerCase();
  const sectorMatch = thesis.sectors.length === 0 || thesis.sectors.some((x) => s.includes(x.toLowerCase()) || x.toLowerCase().includes(s));
  const stageMatch = !row.stage || !thesis.stage || row.stage.toLowerCase() === thesis.stage.toLowerCase();
  if (sectorMatch && stageMatch) return { within: true, reason: `Matches ${thesis.sectors.join(", ")} · ${thesis.stage}` };
  if (!sectorMatch) return { within: false, reason: `fund targets ${thesis.sectors.join(", ") || "—"}, this is ${row.sector || "unknown"}` };
  return { within: false, reason: `fund targets stage ${thesis.stage}, this is ${row.stage}` };
}

function VCBrain() {
  const [thesis, setThesisState] = useState<Thesis>(DEFAULT_THESIS);
  const [thesisOpen, setThesisOpen] = useState(false);
  const [thesisSaved, setThesisSaved] = useState(false);
  const [vcName, setVcName] = useState("Acme Ventures");
  const [company, setCompany] = useState("");
  const [founder, setFounder] = useState("");
  const [urlOrFile, setUrlOrFile] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(-1);
  const [showMemo, setShowMemo] = useState(false);
  const [result, setResult] = useState<RunAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "inbound" | "radar" | "search">("dashboard");
  const runFn = useServerFn(runAnalysis);
  const [deckText, setDeckText] = useState("");
  const [deckMeta, setDeckMeta] = useState<{ fileName: string; pages: number; chars: number } | null>(null);
  const [dashRows, setDashRows] = useState<DashRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<DashRow | null>(null);

  useEffect(() => {
    setDashRows(loadDash());
    setThesisState(loadThesis());
  }, []);

  const setThesis = (t: Thesis) => { setThesisState(t); saveThesis(t); };

  const analyze = async () => {
    setRunning(true);
    setShowMemo(false);
    setResult(null);
    setError(null);
    setStageIdx(0);
    // Weighted stage animation (screening quick, diligence slow)
    const total = PIPELINE.reduce((s, p) => s + p.weight, 0);
    const perUnit = 2500;
    let cum = 0;
    const timers = PIPELINE.map((p, i) => {
      cum += p.weight;
      return setTimeout(() => setStageIdx(i + 1), (cum / total) * perUnit * PIPELINE.length);
    });
    try {
      const r = await runFn({
        data: { vcName, company, founder, url: urlOrFile, deckText, thesis },
      });
      setResult(r);
      setStageIdx(PIPELINE.length);
      setShowMemo(true);
      const sector = thesis.sectors[0] || "Unknown";
      const row: DashRow = {
        id: `${company}-${Date.now()}`,
        company,
        founder,
        vcName,
        recommendation: (r.assessment?.recommendation ?? "diligence"),
        founderScore: r.assessment?.founderScore ?? 0,
        trend: (r.assessment?.axes.founder.trend as DashRow["trend"]) ?? "stable",
        updatedAt: Date.now(),
        sector,
        stage: thesis.stage,
        result: r,
        thesis,
      };
      const next = [row, ...dashRows.filter((x) => x.company !== company)].slice(0, 100);
      setDashRows(next);
      saveDash(next);
    } catch (e) {
      setError((e as Error).message || "Agent run failed");
    } finally {
      timers.forEach(clearTimeout);
      setRunning(false);
    }
  };

  const toggleSector = (s: string) => {
    setThesisSaved(false);
    const next = { ...thesis, sectors: thesis.sectors.includes(s) ? thesis.sectors.filter((x) => x !== s) : [...thesis.sectors, s] };
    setThesis(next);
  };

  const openRow = (r: DashRow) => {
    setSelectedRow(r);
    setResult(r.result);
    setCompany(r.company);
    setFounder(r.founder);
    setShowMemo(true);
    setTab("inbound");
  };

  return (
    <div className="min-h-dvh" style={{ backgroundColor: INK, color: BRAND, fontFamily: "Nunito, system-ui, sans-serif" }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:px-3 focus:py-1 focus:bg-[#DADD98] focus:text-black focus:z-50">Skip to main content</a>
      <header className="border-b" style={{ borderColor: BRAND + "33" }}>
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 flex items-center justify-center font-black text-lg"
              style={{ backgroundColor: BRAND, color: INK, fontFamily: "Geist Mono, monospace" }}
              aria-hidden="true"
            >VC</div>
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ fontFamily: "Rubik, sans-serif" }}>VC BRAIN</h1>
              <div className="text-xs opacity-70" style={{ fontFamily: "Geist Mono, monospace" }}>
                AI-POWERED INVESTMENT ANALYSIS · 24-HOUR DECISION ENGINE
              </div>
            </div>
          </div>
          <div className="text-xs opacity-70 hidden md:block" style={{ fontFamily: "Geist Mono, monospace" }}>
            v0.2 · {dashRows.length} companies in memory
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <nav aria-label="Primary" className="flex flex-wrap gap-2">
          {[
            { k: "dashboard", label: "DASHBOARD", Icon: LayoutDashboard },
            { k: "inbound",   label: "ANALYZE · INBOUND", Icon: FileText },
            { k: "radar",     label: "SOURCING RADAR",    Icon: Radar },
            { k: "search",    label: "FOUNDER SEARCH",    Icon: Search },
          ].map(({ k, label, Icon }) => (
            <TabButton key={k} active={tab === k} onClick={() => setTab(k as typeof tab)} Icon={Icon}>{label}</TabButton>
          ))}
        </nav>

        {tab === "dashboard" && (
          <InvestorDashboard
            rows={dashRows}
            thesis={thesis}
            onOpen={openRow}
            onClear={() => { setDashRows([]); saveDash([]); }}
          />
        )}

        {tab === "radar" && (
          <SourcingRadar
            thesis={thesis}
            onAnalyze={(c) => {
              setCompany(c.title.split("/").pop() || c.title);
              setFounder(c.author || "");
              setUrlOrFile(c.url);
              setTab("inbound");
            }}
          />
        )}

        {tab === "search" && <FounderSearchPanel />}

        {tab === "inbound" && (
          <>
            <ThesisPanel
              thesis={thesis}
              setThesis={setThesis}
              open={thesisOpen}
              setOpen={setThesisOpen}
              saved={thesisSaved}
              onSave={() => { saveThesis(thesis); setThesisSaved(true); }}
              toggleSector={toggleSector}
            />

            <PitchIntake
              vcName={vcName} setVcName={setVcName}
              company={company} setCompany={setCompany}
              founder={founder} setFounder={setFounder}
              urlOrFile={urlOrFile} setUrlOrFile={setUrlOrFile}
              fileName={fileName} setFileName={setFileName}
              deckText={deckText} setDeckText={setDeckText}
              deckMeta={deckMeta} setDeckMeta={setDeckMeta}
              onAnalyze={analyze} running={running}
            />

            {(running || (stageIdx > 0 && !showMemo)) && (
              <ProgressIndicator stageIdx={stageIdx} running={running} />
            )}

            {error && (
              <Card>
                <SectionLabel>Error</SectionLabel>
                <div className="text-sm" style={{ fontFamily: "Geist Mono, monospace" }}>{error}</div>
              </Card>
            )}

            {showMemo && result && (
              <MemoView thesis={(selectedRow?.thesis) || thesis} result={result} allRows={dashRows} />
            )}
          </>
        )}
      </main>

      <footer className="border-t mt-16" style={{ borderColor: BRAND + "22" }}>
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs opacity-60" style={{ fontFamily: "Geist Mono, monospace" }}>
          VC BRAIN · HACKATHON MVP · EVIDENCE-BACKED DECISIONS IN 24H
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Shared UI atoms
// ============================================================

function focusRing(): React.CSSProperties {
  return { outlineOffset: 2 };
}

function TabButton({ active, onClick, children, Icon }: { active: boolean; onClick: () => void; children: React.ReactNode; Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }> }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="px-4 py-2.5 text-xs font-black tracking-[0.15em] border inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-11"
      style={{
        backgroundColor: active ? BRAND : "transparent",
        color: active ? INK : BRAND,
        borderColor: BRAND,
        fontFamily: "Geist Mono, monospace",
      }}
    >
      <Icon size={14} aria-hidden />
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={"border p-5 " + className}
      style={{ borderColor: BRAND + "55", backgroundColor: "rgba(218,221,152,0.04)" }}
    >
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
      style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}
    >
      {children}
    </div>
  );
}

function TrendIcon({ trend, size = 14 }: { trend: string; size?: number }) {
  if (trend === "improving") return <TrendingUp size={size} aria-hidden color={OK} />;
  if (trend === "declining") return <TrendingDown size={size} aria-hidden color={BAD} />;
  return <Minus size={size} aria-hidden color={BRAND} />;
}

function TrendChip({ trend }: { trend: string }) {
  const color = trend === "improving" ? OK : trend === "declining" ? BAD : BRAND;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold"
      style={{ color, fontFamily: "Geist Mono, monospace" }}
    >
      <TrendIcon trend={trend} />
      <span className="uppercase tracking-widest">{trend}</span>
    </span>
  );
}

function RecommendationBadge({ rec, size = "md" }: { rec: "recommend" | "diligence" | "pass"; size?: "sm" | "md" }) {
  const map = {
    recommend: { bg: OK, label: "RECOMMEND INVEST" },
    diligence: { bg: WARN, label: "NEEDS MORE DILIGENCE" },
    pass:      { bg: BAD, label: "PASS" },
  } as const;
  const s = map[rec];
  return (
    <span
      className={size === "sm" ? "px-2 py-1 text-[10px]" : "px-4 py-2 text-sm"}
      style={{ backgroundColor: s.bg, color: INK, fontFamily: "Rubik, sans-serif", fontWeight: 900, letterSpacing: "0.05em" }}
    >
      {s.label}
    </span>
  );
}

function ThesisFitBadge({ within, reason }: { within: boolean; reason: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold border"
      style={{
        borderColor: within ? OK : BAD,
        color: within ? OK : BAD,
        fontFamily: "Geist Mono, monospace",
      }}
      title={reason}
    >
      {within ? <CheckCircle2 size={12} aria-hidden /> : <AlertTriangle size={12} aria-hidden />}
      {within ? "WITHIN THESIS" : "OUTSIDE THESIS"}
    </span>
  );
}

// ============================================================
// Investor Dashboard (A2 + A3)
// ============================================================

function InvestorDashboard({
  rows, thesis, onOpen, onClear,
}: {
  rows: DashRow[]; thesis: Thesis; onOpen: (r: DashRow) => void; onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<FounderSearchResult | null>(null);
  const [nlErr, setNlErr] = useState<string | null>(null);
  const searchFn = useServerFn(searchFounders);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [...rows].sort((a, b) => b.founderScore - a.founderScore);
    return rows
      .filter((r) => r.company.toLowerCase().includes(s) || r.founder.toLowerCase().includes(s) || r.sector.toLowerCase().includes(s))
      .sort((a, b) => b.founderScore - a.founderScore);
  }, [rows, q]);

  const runNL = async () => {
    if (!q.trim()) return;
    setNlLoading(true); setNlErr(null); setNlResult(null);
    try { setNlResult(await searchFn({ data: { query: q } })); }
    catch (e) { setNlErr((e as Error).message); }
    finally { setNlLoading(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionLabel>Investor Dashboard · Ranked Portfolio</SectionLabel>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "Rubik, sans-serif" }}>
              Deals in memory
            </h2>
            <p className="text-sm opacity-80 mt-1">
              Every evaluated company, ranked by Founder Score with live momentum. Click a row to open its memo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
              {rows.length} companies · thesis: {thesis.sectors.join(", ") || "—"} / {thesis.stage}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <label className="flex-1 relative">
            <span className="sr-only">Natural-language founder query</span>
            <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runNL()}
              placeholder='e.g. "technical founder, Berlin, AI infra, enterprise traction, no prior VC backing"'
              className="w-full pl-10 pr-3 py-3 border bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
              style={{ borderColor: BRAND, color: BRAND, ...focusRing() }}
              aria-label="Search deals or run natural-language founder query"
            />
          </label>
          <button
            onClick={runNL}
            disabled={nlLoading || !q.trim()}
            className="px-6 py-3 font-black tracking-wider disabled:opacity-40 inline-flex items-center gap-2 min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ backgroundColor: BRAND, color: INK, fontFamily: "Rubik, sans-serif" }}
          >
            <Sparkles size={14} aria-hidden />
            {nlLoading ? "PARSING…" : "NL SEARCH"}
          </button>
        </div>

        {nlResult && (
          <div className="mt-4">
            <div className="text-[11px] tracking-widest mb-2" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
              PARSED ATTRIBUTES
            </div>
            <div className="flex flex-wrap gap-2">
              {(nlResult.filters.keywords ?? []).map((k) => (
                <span key={k} className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>keyword: {k}</span>
              ))}
              {nlResult.filters.sector && <span className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>sector: {nlResult.filters.sector}</span>}
              {nlResult.filters.geography && <span className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>geo: {nlResult.filters.geography}</span>}
              {nlResult.filters.minScore > 0 && <span className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>score ≥ {nlResult.filters.minScore}</span>}
            </div>
            <div className="mt-3 space-y-2">
              {nlResult.matches.slice(0, 5).map((m) => (
                <div key={m.founderId} className="border p-3" style={{ borderColor: BRAND + "44" }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>{m.name}</div>
                    <div className="text-xs" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
                      {m.latestScore != null && <>SCORE {Math.round(m.latestScore)} · </>}REL {Math.round(m.relevance)}
                    </div>
                  </div>
                  <div className="text-sm opacity-90 mt-1">{m.reason}</div>
                </div>
              ))}
              {nlResult.matches.length === 0 && (
                <div className="text-sm" style={{ color: MUTED }}>No founders in memory matched. Run more analyses to build the profile database.</div>
              )}
            </div>
          </div>
        )}
        {nlErr && <div className="text-sm mt-3" style={{ color: BAD }}>{nlErr}</div>}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionLabel>Ranked companies</SectionLabel>
          {rows.length > 0 && (
            <button onClick={onClear} className="text-[11px] underline opacity-70 hover:opacity-100" style={{ fontFamily: "Geist Mono, monospace" }}>
              clear local memory
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: MUTED }}>
            No deals yet. Head to <span className="font-bold" style={{ color: BRAND }}>ANALYZE · INBOUND</span> and run your first company.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
                  <th className="py-2 text-[11px] tracking-widest">COMPANY</th>
                  <th className="py-2 text-[11px] tracking-widest">RECOMMENDATION</th>
                  <th className="py-2 text-[11px] tracking-widest">FOUNDER SCORE</th>
                  <th className="py-2 text-[11px] tracking-widest">MOMENTUM</th>
                  <th className="py-2 text-[11px] tracking-widest">THESIS</th>
                  <th className="py-2 text-[11px] tracking-widest">UPDATED</th>
                  <th className="py-2 text-[11px] tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const fit = thesisFit({ sector: r.sector, stage: r.stage }, thesis);
                  return (
                    <tr
                      key={r.id}
                      className="border-t hover:bg-white/5 cursor-pointer"
                      style={{ borderColor: BRAND + "22" }}
                      onClick={() => onOpen(r)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && onOpen(r)}
                      role="button"
                      aria-label={`Open memo for ${r.company}`}
                    >
                      <td className="py-3 pr-3">
                        <div className="font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>{r.company}</div>
                        <div className="text-xs" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>{r.founder || "—"} · {r.sector}</div>
                      </td>
                      <td className="py-3 pr-3"><RecommendationBadge rec={r.recommendation} size="sm" /></td>
                      <td className="py-3 pr-3">
                        <span className="text-lg font-black" style={{ fontFamily: "Rubik, sans-serif" }}>{r.founderScore.toFixed(1)}</span>
                        <span className="text-xs opacity-60" style={{ fontFamily: "Geist Mono, monospace" }}> / 10</span>
                      </td>
                      <td className="py-3 pr-3"><TrendChip trend={r.trend} /></td>
                      <td className="py-3 pr-3"><ThesisFitBadge within={fit.within} reason={fit.reason} /></td>
                      <td className="py-3 pr-3 text-xs" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3"><ArrowRight size={16} aria-hidden /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// Thesis Panel (A1)
// ============================================================

function ThesisPanel({
  thesis, setThesis, open, setOpen, saved, onSave, toggleSector,
}: {
  thesis: Thesis; setThesis: (t: Thesis) => void; open: boolean; setOpen: (v: boolean) => void;
  saved: boolean; onSave: () => void; toggleSector: (s: string) => void;
}) {
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
      >
        <div>
          <SectionLabel>Thesis Engine · Config</SectionLabel>
          <h2 className="text-2xl font-black" style={{ fontFamily: "Rubik, sans-serif" }}>Investment Thesis</h2>
          <div className="text-sm opacity-80 mt-1">
            {thesis.sectors.join(" · ") || "No sectors"} · {thesis.stage} · {thesis.geography} · ${thesis.checkMin}–${thesis.checkMax}K · {thesis.ownership}% · {thesis.risk}
          </div>
        </div>
        <div className="text-2xl font-mono" aria-hidden style={{ fontFamily: "Geist Mono, monospace" }}>
          {open ? "[ − ]" : "[ + ]"}
        </div>
      </button>

      {open && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionLabel>Sectors</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((s) => {
                const active = thesis.sectors.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSector(s)}
                    aria-pressed={active}
                    className="px-3 py-2 text-sm font-bold border min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                    style={{
                      backgroundColor: active ? BRAND : "transparent",
                      color: active ? INK : BRAND,
                      borderColor: BRAND,
                      fontFamily: "Rubik, sans-serif",
                    }}
                  >{s}</button>
                );
              })}
            </div>
          </div>

          <div>
            <label>
              <SectionLabel>Stage</SectionLabel>
              <select
                value={thesis.stage}
                onChange={(e) => setThesis({ ...thesis, stage: e.target.value })}
                className="w-full px-3 py-2 border bg-transparent font-bold min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                style={{ borderColor: BRAND, color: BRAND, fontFamily: "Rubik, sans-serif" }}
              >
                {["Pre-seed", "Seed", "Series A"].map((s) => (
                  <option key={s} value={s} style={{ backgroundColor: INK }}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              <SectionLabel>Geography</SectionLabel>
              <input
                value={thesis.geography}
                onChange={(e) => setThesis({ ...thesis, geography: e.target.value })}
                className="w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                style={{ borderColor: BRAND, color: BRAND }}
              />
            </label>
          </div>

          <div>
            <SectionLabel>Check size (${thesis.checkMin}K – ${thesis.checkMax}K)</SectionLabel>
            <div className="flex items-center gap-3">
              <input type="number" aria-label="Minimum check size in thousands"
                value={thesis.checkMin} onChange={(e) => setThesis({ ...thesis, checkMin: +e.target.value })}
                className="w-24 px-3 py-2 border bg-transparent min-h-11" style={{ borderColor: BRAND, color: BRAND }} />
              <span className="opacity-60">to</span>
              <input type="number" aria-label="Maximum check size in thousands"
                value={thesis.checkMax} onChange={(e) => setThesis({ ...thesis, checkMax: +e.target.value })}
                className="w-24 px-3 py-2 border bg-transparent min-h-11" style={{ borderColor: BRAND, color: BRAND }} />
              <span className="opacity-60 text-sm">K USD</span>
            </div>
          </div>

          <div>
            <label>
              <SectionLabel>Ownership target (%)</SectionLabel>
              <input type="number"
                value={thesis.ownership} onChange={(e) => setThesis({ ...thesis, ownership: +e.target.value })}
                className="w-32 px-3 py-2 border bg-transparent min-h-11" style={{ borderColor: BRAND, color: BRAND }} />
            </label>
          </div>

          <div>
            <SectionLabel>Risk appetite · {thesis.risk}</SectionLabel>
            <div className="flex gap-2">
              {["Conservative", "Balanced", "Aggressive"].map((r) => (
                <button
                  key={r}
                  onClick={() => setThesis({ ...thesis, risk: r })}
                  aria-pressed={thesis.risk === r}
                  className="flex-1 px-3 py-2 border text-sm font-bold min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                  style={{
                    backgroundColor: thesis.risk === r ? BRAND : "transparent",
                    color: thesis.risk === r ? INK : BRAND,
                    borderColor: BRAND, fontFamily: "Rubik, sans-serif",
                  }}
                >{r}</button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-4 pt-2">
            <button onClick={onSave} className="px-6 py-2.5 font-black tracking-wide min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={{ backgroundColor: BRAND, color: INK, fontFamily: "Rubik, sans-serif" }}>SAVE THESIS</button>
            {saved && (
              <span className="text-sm inline-flex items-center gap-1.5" style={{ fontFamily: "Geist Mono, monospace" }}>
                <CheckCircle2 size={14} color={OK} aria-hidden /> Saved locally
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================
// Pitch Intake (A7)
// ============================================================

function PitchIntake(props: {
  vcName: string; setVcName: (s: string) => void;
  company: string; setCompany: (s: string) => void;
  founder: string; setFounder: (s: string) => void;
  urlOrFile: string; setUrlOrFile: (s: string) => void;
  fileName: string | null; setFileName: (s: string | null) => void;
  deckText: string; setDeckText: (s: string) => void;
  deckMeta: { fileName: string; pages: number; chars: number } | null;
  setDeckMeta: (m: { fileName: string; pages: number; chars: number } | null) => void;
  onAnalyze: () => void; running: boolean;
}) {
  const hasMin = !!props.company && (!!props.deckMeta || !!props.fileName || !!props.urlOrFile);
  const canSubmit = hasMin && !props.running;
  const parseFn = useServerFn(parseDeck);
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const handleDeck = async (f: File) => {
    setDeckLoading(true); setDeckError(null);
    try {
      const buf = await f.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const r = await parseFn({ data: { fileName: f.name, base64 } });
      props.setDeckText(r.text);
      props.setDeckMeta({ fileName: r.fileName, pages: r.pages, chars: r.chars });
    } catch (e) { setDeckError((e as Error).message); }
    finally { setDeckLoading(false); }
  };
  return (
    <Card>
      <SectionLabel>Pitch Intake · Inbound Application</SectionLabel>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-black" style={{ fontFamily: "Rubik, sans-serif" }}>New Deal</h2>
        <p className="text-xs" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
          Only <span style={{ color: BRAND }}>deck + company name</span> are required — we'll find the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <Field label="VC firm name (memory key)" optional>
          <input value={props.vcName} onChange={(e) => props.setVcName(e.target.value)} placeholder="Acme Ventures"
            className="w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
            style={{ borderColor: BRAND, color: BRAND }} />
        </Field>
        <div />
        <Field label="Company name" required>
          <input value={props.company} onChange={(e) => props.setCompany(e.target.value)} placeholder="Latchfield AI"
            required aria-required="true"
            className="w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
            style={{ borderColor: BRAND, color: BRAND }} />
        </Field>
        <Field label="Founder name" optional>
          <input value={props.founder} onChange={(e) => props.setFounder(e.target.value)} placeholder="Priya Ramaswamy"
            className="w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
            style={{ borderColor: BRAND, color: BRAND }} />
        </Field>

        <div className="md:col-span-2">
          <Field label="Company URL" optional>
            <input value={props.urlOrFile} onChange={(e) => props.setUrlOrFile(e.target.value)} placeholder="https://latchfield.ai"
              className="w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
              style={{ borderColor: BRAND, color: BRAND }} />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Pitch Deck (PDF)" required helper="Parsed server-side into memo inputs.">
            <label className="block border-2 border-dashed p-6 text-center cursor-pointer focus-within:ring-2 focus-within:ring-[#DADD98]" style={{ borderColor: BRAND + "77" }}>
              <input type="file" accept="application/pdf" className="sr-only" aria-label="Upload pitch deck PDF"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDeck(f); }} />
              {deckLoading ? (
                <div className="text-sm inline-flex items-center gap-2" style={{ fontFamily: "Geist Mono, monospace" }}>
                  <Loader2 size={14} className="animate-spin" aria-hidden /> PARSING PDF…
                </div>
              ) : props.deckMeta ? (
                <div className="text-sm inline-flex items-center gap-2" style={{ fontFamily: "Geist Mono, monospace" }}>
                  <CheckCircle2 size={14} color={OK} aria-hidden />
                  {props.deckMeta.fileName} · {props.deckMeta.pages}p · {props.deckMeta.chars.toLocaleString()} chars
                </div>
              ) : (
                <>
                  <div className="font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>Drop deck PDF here</div>
                  <div className="text-xs opacity-70 mt-1" style={{ fontFamily: "Geist Mono, monospace" }}>CLICK TO BROWSE · PDF ONLY</div>
                </>
              )}
            </label>
            {deckError && <div className="text-xs mt-2" style={{ color: BAD, fontFamily: "Geist Mono, monospace" }}>{deckError}</div>}
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          disabled={!canSubmit}
          onClick={props.onAnalyze}
          className="px-8 py-3 font-black tracking-wider disabled:opacity-40 min-h-11 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{ backgroundColor: BRAND, color: INK, fontFamily: "Rubik, sans-serif" }}
        >
          {props.running ? <><Loader2 size={16} className="animate-spin" aria-hidden /> ANALYZING…</> : <>ANALYZE <ArrowRight size={16} aria-hidden /></>}
        </button>
        {!hasMin && (
          <span className="text-xs" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
            Add a company name and a deck (or URL) to enable analysis.
          </span>
        )}
      </div>
    </Card>
  );
}

function Field({ label, required, optional, helper, children }: { label: string; required?: boolean; optional?: boolean; helper?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>{label}</span>
        {required && <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ backgroundColor: BRAND, color: INK, fontFamily: "Geist Mono, monospace" }}>REQUIRED</span>}
        {optional && <span className="text-[10px]" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>· optional</span>}
      </div>
      {children}
      {helper && <div className="text-[11px] mt-1.5" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>{helper}</div>}
    </div>
  );
}

// ============================================================
// Progress Indicator (A4)
// ============================================================

function ProgressIndicator({ stageIdx, running }: { stageIdx: number; running: boolean }) {
  const totalWeight = PIPELINE.reduce((s, p) => s + p.weight, 0);
  return (
    <Card>
      <SectionLabel>Pipeline · Live agent run</SectionLabel>
      <div className="mb-4 h-1 w-full" style={{ backgroundColor: BRAND + "22" }}>
        {(() => {
          const done = PIPELINE.slice(0, stageIdx).reduce((s, p) => s + p.weight, 0);
          const pct = Math.min(100, (done / totalWeight) * 100);
          return <div className="h-full transition-all" style={{ width: pct + "%", backgroundColor: BRAND }} />;
        })()}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {PIPELINE.map((p, i) => {
          const done = i < stageIdx;
          const active = i === stageIdx - 1 && running;
          const flex = p.weight;
          const Icon = done ? CheckCircle2 : active ? Loader2 : Circle;
          const color = done ? OK : active ? BRAND : MUTED;
          return (
            <div key={p.key} className="border p-3" style={{ borderColor: BRAND + "44", flex, opacity: done || active ? 1 : 0.6 }}>
              <div className="flex items-center gap-2">
                <Icon size={16} color={color} aria-hidden className={active ? "animate-spin" : ""} />
                <span className="text-[10px] font-bold tracking-widest" style={{ fontFamily: "Geist Mono, monospace", color }}>
                  {p.agent.toUpperCase()}
                </span>
              </div>
              <div className="text-xs mt-1.5" style={{ fontFamily: "Geist Mono, monospace" }}>{p.label}</div>
              <div className="text-[10px] mt-1" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
                weight {p.weight}× {p.key === "screening" ? "· fast filter" : p.key === "diligence" ? "· deep verify" : ""}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[11px]" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
        Screening is the fast first-pass filter; Diligence is the heavier verification loop that runs after screening approves.
      </div>
    </Card>
  );
}

// ============================================================
// Memo View
// ============================================================

type Assessment = NonNullable<RunAnalysisResult["assessment"]>;

function MemoView({ thesis, result, allRows }: { thesis: Thesis; result: RunAnalysisResult; allRows: DashRow[] }) {
  const a = result.assessment;
  const [lens, setLens] = useState<"bull" | "bear">("bull");

  const [pdfBusy, setPdfBusy] = useState(false);
  const downloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      // html-to-image renders via the browser's own CSS engine, so it supports
      // modern colors like oklch() (Tailwind v4) that html2canvas cannot parse.
      const [{ default: jsPDF }, { toCanvas }] = await Promise.all([
        import("jspdf"),
        import("html-to-image"),
      ]);
      const el = document.getElementById("memo-export");
      if (!el) return;
      const canvas = await toCanvas(el, { backgroundColor: INK, pixelRatio: 2, cacheBust: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${result.company || "memo"}-vc-brain.pdf`);
    } catch (e) {
      console.error("[pdf] export failed", e);
      alert("PDF export failed: " + ((e as Error)?.message || "unknown error"));
    } finally {
      setPdfBusy(false);
    }
  };

  if (!a) {
    return (
      <Card>
        <SectionLabel>Assessment failed</SectionLabel>
        <p className="text-sm opacity-90">The Assessment agent could not produce structured output. Raw sourcing findings:</p>
        <pre className="text-xs mt-3 whitespace-pre-wrap opacity-90" style={{ fontFamily: "Geist Mono, monospace" }}>{result.sourcingRaw}</pre>
      </Card>
    );
  }

  // Portfolio concentration check
  const sameSector = allRows.filter((r) => r.sector && thesis.sectors[0] && r.sector.toLowerCase() === thesis.sectors[0].toLowerCase());
  const portfolioCheck = sameSector.length >= 2
    ? { warn: true, text: `Fund already holds ${sameSector.length} ${thesis.sectors[0]} ${thesis.stage.toLowerCase()} position(s) — this would be the ${sameSector.length + 1}${["st","nd","rd"][sameSector.length] ?? "th"}. Concentration risk elevated.` }
    : { warn: false, text: `Fund holds ${sameSector.length} ${thesis.sectors[0] || "matching"} ${thesis.stage.toLowerCase()} position(s). No concentration risk at this size.` };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={downloadPdf} disabled={pdfBusy}
          className="px-5 py-2.5 font-black tracking-wider min-h-11 inline-flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{ backgroundColor: BRAND, color: INK, fontFamily: "Rubik, sans-serif" }}>
          {pdfBusy ? <><Loader2 size={16} className="animate-spin" aria-hidden /> EXPORTING…</> : <>↓ DOWNLOAD PDF</>}
        </button>
      </div>
      <div id="memo-export" className="space-y-6" style={{ backgroundColor: INK }}>
        <MemoHeader company={result.company} a={a} thesis={thesis} />
        <DecisionBar a={a} portfolioCheck={portfolioCheck} thesis={thesis} />
        <ScoreCards a={a} founderName={result.founder || "Founder"} />
        <AxesRow a={a} />
        <ColdStartBanner cold={result.coldStart} history={result.founderScoreHistory} founderName={result.founder || ""} />

        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <SectionLabel>Adversarial View · Bull vs. Bear</SectionLabel>
            <div role="tablist" aria-label="Adversarial lens" className="inline-flex border" style={{ borderColor: BRAND }}>
              <LensBtn active={lens === "bull"} onClick={() => setLens("bull")}>BULL CASE</LensBtn>
              <LensBtn active={lens === "bear"} onClick={() => setLens("bear")}>BEAR CASE</LensBtn>
            </div>
          </div>
          {lens === "bull" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <SubCard title="Investment Hypotheses">
                <ul className="space-y-2 text-sm">
                  {a.hypotheses.map((h) => <li key={h} className="flex gap-2"><span style={{ color: BRAND }}>▸</span><span>{h}</span></li>)}
                </ul>
              </SubCard>
              <SubCard title="Strengths + Opportunities">
                <ul className="space-y-2 text-sm">
                  {[...a.strengths, ...a.opportunities].map((h) => <li key={h} className="flex gap-2"><CheckCircle2 size={14} color={OK} aria-hidden className="mt-1" /><span>{h}</span></li>)}
                </ul>
              </SubCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <SubCard title="Devil's Advocate">
                <p className="text-sm leading-relaxed">{a.disagreement || "No strong counter-argument identified."}</p>
              </SubCard>
              <SubCard title="Weaknesses + Risks">
                <ul className="space-y-2 text-sm">
                  {[...a.weaknesses, ...a.risks].map((h) => <li key={h} className="flex gap-2"><AlertTriangle size={14} color={WARN} aria-hidden className="mt-1" /><span>{h}</span></li>)}
                </ul>
              </SubCard>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <SectionLabel>Company Snapshot</SectionLabel>
            <p className="text-sm leading-relaxed">{a.snapshot}</p>
          </Card>
          <Card>
            <SectionLabel>Problem & Product</SectionLabel>
            <p className="text-sm leading-relaxed">{a.problemAndProduct || <span style={{ color: MUTED }}>Not disclosed.</span>}</p>
          </Card>
        </div>

        <Traction a={a} />
        <SWOT a={a} />
        <Claims a={a} />
        <Gaps a={a} />

        <Card>
          <SectionLabel>Agent Trace · Live Run</SectionLabel>
          <ul className="space-y-1 text-xs" style={{ fontFamily: "Geist Mono, monospace" }}>
            {result.trace.map((t, i) => (
              <li key={i} className="opacity-90">
                <span style={{ color: BRAND }}>[{t.agent}]</span> {t.step}{t.detail ? ` — ${t.detail}` : ""}
              </li>
            ))}
          </ul>
          {result.priorMemoryUsed.length > 0 && (
            <div className="mt-3 text-xs inline-flex items-center gap-2">
              <Trophy size={14} color={BRAND} aria-hidden /> Reused {result.priorMemoryUsed.length} prior note(s) from VC memory.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function LensBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className="px-4 py-2 text-xs font-black tracking-widest min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
      style={{ backgroundColor: active ? BRAND : "transparent", color: active ? INK : BRAND, fontFamily: "Geist Mono, monospace" }}>
      {children}
    </button>
  );
}

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border p-4" style={{ borderColor: BRAND + "44" }}>
      <div className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>{title}</div>
      {children}
    </div>
  );
}

function DecisionBar({ a, portfolioCheck, thesis }: { a: Assessment; portfolioCheck: { warn: boolean; text: string }; thesis: Thesis }) {
  const trust = a.claims.length > 0 ? Math.round(100 * a.claims.filter((c) => c.trust === "verified").length / a.claims.length) : 0;
  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <SectionLabel>Investment Decision · $100K in 24h</SectionLabel>
          <div className="text-sm inline-flex items-center gap-2">
            <ShieldAlert size={14} color={portfolioCheck.warn ? WARN : BRAND} aria-hidden />
            <span style={{ color: portfolioCheck.warn ? WARN : BRAND }}>Portfolio check:</span>
            <span className="opacity-90">{portfolioCheck.text}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>
            Thesis: {thesis.sectors.join(", ")} · {thesis.stage} · check ${thesis.checkMin}–${thesis.checkMax}K
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="border px-4 py-2 text-center" style={{ borderColor: BRAND }}>
            <div className="text-[10px] tracking-widest" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>TRUST SCORE</div>
            <div className="text-2xl font-black" style={{ fontFamily: "Rubik, sans-serif" }}>{trust}<span className="text-xs opacity-60"> / 100</span></div>
          </div>
          <RecommendationBadge rec={a.recommendation} />
        </div>
      </div>
    </Card>
  );
}

function MemoHeader({ company, a, thesis }: { company: string; a: Assessment; thesis: Thesis }) {
  return (
    <Card className="!p-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <SectionLabel>Investment Memo</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "Rubik, sans-serif" }}>{company}</h2>
          <div className="text-lg opacity-90 mt-2">{a.thesisFitNote}</div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <RecommendationBadge rec={a.recommendation} />
          <ThesisFitBadge within={a.thesisFit} reason={a.thesisFit ? `Matches ${thesis.sectors.join(", ")}` : `fund targets ${thesis.sectors.join(", ") || "—"}`} />
        </div>
      </div>
    </Card>
  );
}

function ScoreCards({ a, founderName }: { a: Assessment; founderName: string }) {
  const cards = [
    { label: "Founder", score: a.founderScore, detail: a.founderBlurb, sub: founderName, verdict: null as string | null },
    { label: "Company Reputation", score: a.companyReputationScore, detail: "Signal from Reddit + web sources.", sub: "", verdict: null },
    { label: "Risk", score: a.riskScore, detail: a.shouldInvest ? "Risk verdict: acceptable." : "Risk verdict: elevated.", sub: "", verdict: a.shouldInvest ? "acceptable" : "elevated" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <SectionLabel>{c.label} Score</SectionLabel>
          <div className="flex items-baseline gap-3">
            <div className="text-5xl font-black" style={{ fontFamily: "Rubik, sans-serif", color: BRAND }}>{c.score.toFixed(1)}</div>
            <div className="text-xs opacity-70" style={{ fontFamily: "Geist Mono, monospace" }}>/ 10</div>
          </div>
          {c.sub && <div className="text-sm font-bold mt-2" style={{ fontFamily: "Rubik, sans-serif" }}>{c.sub}</div>}
          <p className="text-xs mt-2 leading-relaxed" style={{ color: MUTED }}>{c.detail}</p>
        </Card>
      ))}
    </div>
  );
}

function AxesRow({ a }: { a: Assessment }) {
  const cells = [
    { label: "Founder", score: a.axes.founder.score, trend: a.axes.founder.trend, chip: null as string | null, note: a.axes.founder.rationale },
    { label: "Market", score: a.axes.market.score, trend: a.axes.market.trend, chip: a.axes.market.stance.toUpperCase(), note: a.axes.market.rationale },
    { label: "Idea vs. Market", score: a.axes.ideaVsMarket.score, trend: a.axes.ideaVsMarket.trend, chip: a.axes.ideaVsMarket.survivesAsIs ? "SURVIVES AS-IS" : "PIVOT LIKELY", note: a.axes.ideaVsMarket.rationale },
  ];
  return (
    <div>
      <div className="mb-3"><SectionLabel>3-Axis Screening · scores kept separate</SectionLabel></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cells.map((c) => (
          <Card key={c.label}>
            <div className="flex items-center justify-between">
              <SectionLabel>{c.label}</SectionLabel>
              <TrendChip trend={c.trend} />
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className="text-5xl font-black" style={{ fontFamily: "Rubik, sans-serif", color: BRAND }}>{c.score.toFixed(1)}</div>
              <div className="text-xs opacity-70" style={{ fontFamily: "Geist Mono, monospace" }}>/ 10</div>
            </div>
            {c.chip && (
              <div className="mt-2 inline-block px-2 py-1 text-[10px] font-black tracking-widest border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>{c.chip}</div>
            )}
            <p className="text-xs mt-2 leading-relaxed" style={{ color: MUTED }}>{c.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ColdStartBanner({ cold, history, founderName }: { cold: { active: boolean; confidence: number; note: string }; history: number[]; founderName: string }) {
  if (!cold.active && history.length === 0) return null;
  const known = !cold.active && history.length > 0;
  return (
    <Card>
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 -m-1 p-4"
        style={{
          borderLeft: `4px solid ${known ? OK : "#60a5fa"}`,
          backgroundColor: known ? "rgba(34,197,94,0.06)" : "rgba(96,165,250,0.06)",
        }}
      >
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1 inline-flex items-center gap-2" style={{ fontFamily: "Geist Mono, monospace", color: known ? OK : "#60a5fa" }}>
            {known ? <><Trophy size={14} aria-hidden /> KNOWN FOUNDER</> : <><Snowflake size={14} aria-hidden /> COLD-START FOUNDER</>}
          </div>
          <div className="text-lg font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>{founderName || "Founder"}</div>
          {cold.active && (
            <div className="text-xs mt-1" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
              confidence {(cold.confidence * 100).toFixed(0)}% · {cold.note}
            </div>
          )}
          {known && (
            <div className="text-xs mt-1" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
              {history.length} score snapshot(s) on file · Founder Score is persistent across your fund's applications.
            </div>
          )}
        </div>
        {history.length > 0 && (
          <div className="flex items-end gap-2" aria-label="Founder score history">
            {history.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-6" style={{ height: `${Math.max(6, s / 2)}px`, backgroundColor: BRAND, opacity: i === history.length - 1 ? 1 : 0.5 }} />
                <div className="text-[10px] mt-1" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>{Math.round(s)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function SWOT({ a }: { a: Assessment }) {
  const cells = [
    ["Strengths", a.strengths],
    ["Weaknesses", a.weaknesses],
    ["Opportunities", a.opportunities],
    ["Risks", a.risks],
  ] as const;
  return (
    <div>
      <div className="mb-3"><SectionLabel>SWOT</SectionLabel></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cells.map(([label, items]) => (
          <Card key={label}>
            <div className="text-xs font-bold tracking-widest mb-3" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>{label.toUpperCase()}</div>
            <ul className="space-y-2 text-sm">
              {items.map((it) => (
                <li key={it} className="flex items-start gap-2"><span aria-hidden>▸</span><span className="flex-1">{it}</span></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Claims({ a }: { a: Assessment }) {
  const styles = {
    verified:     { bg: OK,   Icon: CheckCircle2,  label: "VERIFIED" },
    unverified:   { bg: WARN, Icon: AlertTriangle, label: "UNVERIFIED" },
    contradicted: { bg: BAD,  Icon: Flag,          label: "CONTRADICTED" },
  } as const;
  return (
    <div>
      <div className="mb-3"><SectionLabel>Claims & Trust · Validator-checked</SectionLabel></div>
      <div className="space-y-3">
        {a.claims.map((c, i) => {
          const s = styles[c.trust];
          const Icon = s.Icon;
          return (
            <Card key={i}>
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 font-black text-xs tracking-wider whitespace-nowrap self-start"
                  style={{ backgroundColor: s.bg, color: INK, fontFamily: "Rubik, sans-serif" }}>
                  <Icon size={14} aria-hidden /> {s.label}
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold" style={{ fontFamily: "Rubik, sans-serif" }}>&ldquo;{c.text}&rdquo;</div>
                  <div className="text-sm mt-2 opacity-90">{c.evidence}</div>
                  {c.evidenceUrl && (
                    <a href={c.evidenceUrl} target="_blank" rel="noreferrer"
                      className="text-xs underline mt-1 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                      style={{ color: BRAND, fontFamily: "Geist Mono, monospace" }}>
                      ↗ {c.evidenceUrl.slice(0, 70)}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Traction({ a }: { a: Assessment }) {
  return (
    <Card>
      <SectionLabel>Traction & KPIs</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {a.tractionKPIs.map((k) => (
          <div key={k.label} className="border p-3" style={{ borderColor: BRAND + "33" }}>
            <div className="text-[10px] tracking-widest" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>{k.label.toUpperCase()}</div>
            <div className="text-lg font-black mt-1" style={{ fontFamily: "Rubik, sans-serif", color: k.disclosed ? BRAND : MUTED }}>
              {k.disclosed ? k.value : "not disclosed"}
            </div>
          </div>
        ))}
        {a.tractionKPIs.length === 0 && <div className="col-span-full text-sm" style={{ color: MUTED }}>No KPIs disclosed.</div>}
      </div>
    </Card>
  );
}

function Gaps({ a }: { a: Assessment }) {
  return (
    <div className="border-2 border-dashed p-6" style={{ borderColor: MUTED + "77", backgroundColor: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Info size={14} color={MUTED} aria-hidden />
        <div className="text-xs font-bold tracking-[0.2em] uppercase" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>Disclosed Gaps · Not Available</div>
        <span className="text-[10px]" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }} title="These are gaps the model explicitly flagged rather than guessed.">
          (hover: what is this?)
        </span>
      </div>
      <ul className="space-y-1.5 text-sm" style={{ color: MUTED }}>
        {a.gaps.map((g) => (
          <li key={g} style={{ fontFamily: "Geist Mono, monospace" }}>— {g}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Sourcing Radar (A5: Activate)
// ============================================================

function SourcingRadar({ thesis, onAnalyze }: { thesis: Thesis; onAnalyze: (c: OutboundCandidate) => void }) {
  const [keyword, setKeyword] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanOutboundResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [outreach, setOutreach] = useState<Record<string, number>>({});
  const scanFn = useServerFn(scanOutbound);

  useEffect(() => { setOutreach(loadOutreach()); }, []);

  const activate = (c: OutboundCandidate) => {
    const next = { ...outreach, [c.url]: Date.now() };
    setOutreach(next);
    saveOutreach(next);
  };

  const run = async () => {
    setScanning(true); setErr(null);
    try { setScan(await scanFn({ data: { sectors: thesis.sectors, stage: thesis.stage, geography: thesis.geography, keyword } })); }
    catch (e) { setErr((e as Error).message); }
    finally { setScanning(false); }
  };

  return (
    <Card>
      <SectionLabel>Outbound · Sourcing Radar</SectionLabel>
      <h2 className="text-2xl font-black mb-3" style={{ fontFamily: "Rubik, sans-serif" }}>Find founders before they apply</h2>
      <p className="text-sm opacity-90 mb-4">Scans HackerNews, GitHub (100★+), and arXiv for candidates aligned with your thesis. <b>Analyze</b> pulls a candidate into the memo pipeline; <b>Activate</b> queues cold outreach to convert them into inbound.</p>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Extra keyword (e.g. guardrails, vector db, edge compute)"
          className="flex-1 px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
          style={{ borderColor: BRAND, color: BRAND }} aria-label="Sourcing radar keyword" />
        <button onClick={run} disabled={scanning}
          className="px-6 py-2 font-black tracking-wider disabled:opacity-40 min-h-11 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{ backgroundColor: BRAND, color: INK, fontFamily: "Rubik, sans-serif" }}>
          {scanning ? <><Loader2 size={14} className="animate-spin" aria-hidden /> SCANNING…</> : <>SCAN NOW <ArrowRight size={14} aria-hidden /></>}
        </button>
      </div>
      {err && <div className="text-sm mb-3" style={{ color: BAD }}>{err}</div>}
      {scan && (
        <>
          <div className="text-xs mb-3" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
            Q: “{scan.query}” · keywords: [{scan.keywords.join(", ")}] · HN:{scan.counts.hackernews} · GH:{scan.counts.github} · arXiv:{scan.counts.arxiv} · relevant {scan.relevantCount}/{scan.counts.hackernews + scan.counts.github + scan.counts.arxiv}
          </div>
          <div className="space-y-3">
            {scan.candidates.map((c, i) => {
              const strong = c.signalScore >= 0.6;
              const activated = !!outreach[c.url];
              return (
                <div key={i} className="border p-4 flex flex-col md:flex-row md:items-start justify-between gap-3"
                  style={{ borderColor: BRAND + (strong ? "aa" : "33"), opacity: strong ? 1 : 0.75 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-black tracking-widest inline-flex items-center gap-1"
                        style={{ backgroundColor: BRAND, color: INK, fontFamily: "Geist Mono, monospace" }}>
                        <Building2 size={10} aria-hidden />{c.source.toUpperCase()}
                      </span>
                      <a href={c.url} target="_blank" rel="noreferrer"
                        className="font-bold underline truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                        style={{ fontFamily: "Rubik, sans-serif", color: BRAND }}>
                        {c.title}
                      </a>
                      {c.author && <span className="text-xs" style={{ color: MUTED, fontFamily: "Geist Mono, monospace" }}>· {c.author}</span>}
                      {activated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: OK, color: INK, fontFamily: "Geist Mono, monospace" }}>
                          <Send size={10} aria-hidden /> OUTREACH SENT
                        </span>
                      )}
                    </div>
                    {c.snippet && <div className="text-sm mt-1 opacity-90">{c.snippet}</div>}
                    <div className="text-[11px] mt-2 inline-flex items-center gap-2" style={{ fontFamily: "Geist Mono, monospace" }}>
                      <span className="px-1.5 py-0.5 border" style={{ borderColor: strong ? BRAND : MUTED, color: strong ? BRAND : MUTED }}>
                        REL {(c.signalScore * 100).toFixed(0)}/100 {strong ? "· strong" : "· weak"}
                      </span>
                      <span style={{ color: MUTED }}>· {c.signals.join(" · ")}</span>
                    </div>
                    {c.relevanceReason && <div className="text-xs mt-1" style={{ color: MUTED }}>↳ {c.relevanceReason}</div>}
                  </div>
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <button onClick={() => onAnalyze(c)} aria-label={`Analyze ${c.title}`}
                      className="px-4 py-2 text-xs font-black tracking-widest border whitespace-nowrap min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
                      style={{ borderColor: BRAND, color: BRAND, fontFamily: "Geist Mono, monospace" }}>
                      ANALYZE →
                    </button>
                    <button onClick={() => activate(c)} disabled={activated} aria-label={`Activate outreach to ${c.title}`}
                      className="px-4 py-2 text-xs font-black tracking-widest whitespace-nowrap min-h-11 inline-flex items-center gap-1.5 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      style={{ backgroundColor: BRAND, color: INK, fontFamily: "Geist Mono, monospace" }}>
                      <Send size={12} aria-hidden />{activated ? "QUEUED" : "ACTIVATE"}
                    </button>
                  </div>
                </div>
              );
            })}
            {scan.candidates.length === 0 && (
              <div className="text-sm" style={{ color: MUTED }}>
                No strong matches found. Fetched {scan.counts.hackernews + scan.counts.github + scan.counts.arxiv} raw results across sources, but none scored ≥35 relevance for this thesis. Try different keywords.
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

// ============================================================
// Founder Search Panel (standalone tab)
// ============================================================

function FounderSearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<FounderSearchResult | null>(null);
  const searchFn = useServerFn(searchFounders);
  const run = async () => {
    if (!query.trim()) return;
    setLoading(true); setErr(null);
    try { setResult(await searchFn({ data: { query } })); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };
  return (
    <Card>
      <SectionLabel>Founder Search · Natural-Language Query</SectionLabel>
      <h2 className="text-2xl font-black mb-3" style={{ fontFamily: "Rubik, sans-serif" }}>Query the founder memory</h2>
      <p className="text-sm opacity-90 mb-4">Ask in plain English — the LLM parses filters and ranks matches from your persistent founder profiles (scores, signals, prior screenings).</p>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder='e.g. "technical founder, Berlin, AI infra, enterprise traction, no prior VC backing"'
          className="flex-1 px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]"
          style={{ borderColor: BRAND, color: BRAND }} aria-label="Natural language founder query" />
        <button onClick={run} disabled={loading || !query.trim()}
          className="px-6 py-2 font-black tracking-wider disabled:opacity-40 min-h-11 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{ backgroundColor: BRAND, color: INK, fontFamily: "Rubik, sans-serif" }}>
          {loading ? <><Loader2 size={14} className="animate-spin" aria-hidden /> SEARCHING…</> : <>SEARCH <ArrowRight size={14} aria-hidden /></>}
        </button>
      </div>
      {err && <div className="text-sm mb-3" style={{ color: BAD }}>{err}</div>}
      {result && (
        <>
          <div className="mb-3">
            <div className="text-[11px] tracking-widest mb-2" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>PARSED ATTRIBUTES</div>
            <div className="flex flex-wrap gap-2">
              {result.filters.keywords.map((k) => (
                <span key={k} className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>keyword: {k}</span>
              ))}
              {result.filters.sector && <span className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>sector: {result.filters.sector}</span>}
              {result.filters.geography && <span className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>geo: {result.filters.geography}</span>}
              {result.filters.minScore > 0 && <span className="px-2 py-1 text-[11px] border" style={{ borderColor: BRAND, fontFamily: "Geist Mono, monospace" }}>score ≥ {result.filters.minScore}</span>}
            </div>
          </div>
          <div className="space-y-3">
            {result.matches.map((m) => (
              <div key={m.founderId} className="border p-4" style={{ borderColor: BRAND + "44" }}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-bold text-lg" style={{ fontFamily: "Rubik, sans-serif" }}>{m.name}</div>
                  <div className="flex items-center gap-3 text-xs" style={{ fontFamily: "Geist Mono, monospace" }}>
                    {m.latestScore != null && <span>SCORE {Math.round(m.latestScore)}/100</span>}
                    {m.trend && <TrendChip trend={m.trend} />}
                    <span className="px-2 py-0.5" style={{ backgroundColor: BRAND, color: INK }}>REL {Math.round(m.relevance)}</span>
                  </div>
                </div>
                <div className="text-sm mt-2 opacity-90">{m.reason}</div>
                {m.rationale && <div className="text-xs mt-1 italic" style={{ color: MUTED }}>{m.rationale}</div>}
                {m.signals.length > 0 && (
                  <div className="text-[11px] mt-2" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
                    signals: {m.signals.map((s) => s.snippet.slice(0, 60)).join(" · ")}
                  </div>
                )}
                {m.screenings.length > 0 && (
                  <div className="text-[11px] mt-1" style={{ fontFamily: "Geist Mono, monospace", color: MUTED }}>
                    prior screenings: {m.screenings.map((s) => `${s.company}→${s.recommendation}`).join(" · ")}
                  </div>
                )}
              </div>
            ))}
            {result.matches.length === 0 && (
              <div className="text-sm" style={{ color: MUTED }}>No founders in memory matched this query. Run some analyses first to build the founder database.</div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}