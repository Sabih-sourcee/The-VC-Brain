import { o as __toESM } from "../_runtime.mjs";
import { E as isRedirect, g as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import { dt as number, ft as object, ht as string, rt as array } from "../_libs/@ai-sdk/gateway+[...].mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-DbSJViW4.mjs";
import { _ as Circle, a as Sparkles, b as ArrowRight, c as Send, d as Minus, f as LoaderCircle, g as FileText, h as Flag, i as TrendingDown, l as Search, m as Info, n as TriangleAlert, o as Snowflake, p as LayoutDashboard, r as TrendingUp, s as ShieldAlert, t as Trophy, u as Radar, v as CircleCheck, y as Building2 } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DQQB72Pm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var InputSchema$3 = object({
	vcName: string().min(1),
	company: string().min(1),
	founder: string().default(""),
	url: string().default(""),
	deckText: string().default(""),
	thesis: object({
		sectors: array(string()),
		stage: string(),
		geography: string(),
		checkMin: number(),
		checkMax: number(),
		ownership: number(),
		risk: string()
	})
});
var runAnalysis = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema$3.parse(input)).handler(createSsrRpc("13681914ed0c9657fa5d85c47b782c575657738647e482f375f5d1a012356510"));
var InputSchema$2 = object({
	sectors: array(string()).default([]),
	stage: string().default("Seed"),
	geography: string().default(""),
	keyword: string().default("")
});
var scanOutbound = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema$2.parse(input)).handler(createSsrRpc("a4a9ff656d01f951d1d127b3df5142dda40742466a19c214d44efa4c956d0129"));
var InputSchema$1 = object({
	fileName: string(),
	base64: string().min(10)
});
var parseDeck = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema$1.parse(input)).handler(createSsrRpc("6778bfffdd218c4cdb75df17a950a04838202dbc31830e0c1a55d3f1a3fd71d9"));
var InputSchema = object({ query: string().min(1) });
var searchFounders = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema.parse(input)).handler(createSsrRpc("555eb6387865ed56ff2bc65b4f9ba61f40063273b85495f05747803874ad3952"));
var BRAND = "#DADD98";
var INK = "#000000";
var OK = "#22c55e";
var WARN = "#eab308";
var BAD = "#ef4444";
var MUTED = "#c9ccb0";
var SECTORS = [
	"AI infra",
	"Fintech",
	"Healthtech",
	"Consumer",
	"Climate",
	"Devtools",
	"Bio"
];
var DEFAULT_THESIS = {
	sectors: ["AI infra", "Devtools"],
	stage: "Seed",
	geography: "US, Remote-first",
	checkMin: 50,
	checkMax: 250,
	ownership: 8,
	risk: "Balanced"
};
var PIPELINE = [
	{
		key: "memory",
		label: "Memory · recall VC notes",
		agent: "Memory Agent",
		weight: 1
	},
	{
		key: "sourcing",
		label: "Sourcing · crawl web + Reddit",
		agent: "Sourcing Agent",
		weight: 3
	},
	{
		key: "screening",
		label: "Screening · 3-axis first pass",
		agent: "Screening Agent",
		weight: 1
	},
	{
		key: "diligence",
		label: "Diligence · claim verification",
		agent: "Validator Agent",
		weight: 3
	},
	{
		key: "decision",
		label: "Decision · assemble memo",
		agent: "Assessment Agent",
		weight: 1
	}
];
var DASH_KEY = "vcbrain:dashboard:v1";
var THESIS_KEY = "vcbrain:thesis:v1";
var OUTREACH_KEY = "vcbrain:outreach:v1";
function loadDash() {
	if (typeof window === "undefined") return [];
	try {
		return JSON.parse(localStorage.getItem(DASH_KEY) || "[]");
	} catch {
		return [];
	}
}
function saveDash(rows) {
	try {
		localStorage.setItem(DASH_KEY, JSON.stringify(rows.slice(0, 100)));
	} catch {}
}
function loadThesis() {
	if (typeof window === "undefined") return DEFAULT_THESIS;
	try {
		return {
			...DEFAULT_THESIS,
			...JSON.parse(localStorage.getItem(THESIS_KEY) || "{}")
		};
	} catch {
		return DEFAULT_THESIS;
	}
}
function saveThesis(t) {
	try {
		localStorage.setItem(THESIS_KEY, JSON.stringify(t));
	} catch {}
}
function loadOutreach() {
	if (typeof window === "undefined") return {};
	try {
		return JSON.parse(localStorage.getItem(OUTREACH_KEY) || "{}");
	} catch {
		return {};
	}
}
function saveOutreach(o) {
	try {
		localStorage.setItem(OUTREACH_KEY, JSON.stringify(o));
	} catch {}
}
function thesisFit(row, thesis) {
	const s = (row.sector || "").toLowerCase();
	const sectorMatch = thesis.sectors.length === 0 || thesis.sectors.some((x) => s.includes(x.toLowerCase()) || x.toLowerCase().includes(s));
	const stageMatch = !row.stage || !thesis.stage || row.stage.toLowerCase() === thesis.stage.toLowerCase();
	if (sectorMatch && stageMatch) return {
		within: true,
		reason: `Matches ${thesis.sectors.join(", ")} · ${thesis.stage}`
	};
	if (!sectorMatch) return {
		within: false,
		reason: `fund targets ${thesis.sectors.join(", ") || "—"}, this is ${row.sector || "unknown"}`
	};
	return {
		within: false,
		reason: `fund targets stage ${thesis.stage}, this is ${row.stage}`
	};
}
function VCBrain() {
	const [thesis, setThesisState] = (0, import_react.useState)(DEFAULT_THESIS);
	const [thesisOpen, setThesisOpen] = (0, import_react.useState)(false);
	const [thesisSaved, setThesisSaved] = (0, import_react.useState)(false);
	const [vcName, setVcName] = (0, import_react.useState)("Acme Ventures");
	const [company, setCompany] = (0, import_react.useState)("");
	const [founder, setFounder] = (0, import_react.useState)("");
	const [urlOrFile, setUrlOrFile] = (0, import_react.useState)("");
	const [fileName, setFileName] = (0, import_react.useState)(null);
	const [running, setRunning] = (0, import_react.useState)(false);
	const [stageIdx, setStageIdx] = (0, import_react.useState)(-1);
	const [showMemo, setShowMemo] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("dashboard");
	const runFn = useServerFn(runAnalysis);
	const [deckText, setDeckText] = (0, import_react.useState)("");
	const [deckMeta, setDeckMeta] = (0, import_react.useState)(null);
	const [dashRows, setDashRows] = (0, import_react.useState)([]);
	const [selectedRow, setSelectedRow] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setDashRows(loadDash());
		setThesisState(loadThesis());
	}, []);
	const setThesis = (t) => {
		setThesisState(t);
		saveThesis(t);
	};
	const analyze = async () => {
		setRunning(true);
		setShowMemo(false);
		setResult(null);
		setError(null);
		setStageIdx(0);
		const total = PIPELINE.reduce((s, p) => s + p.weight, 0);
		const perUnit = 2500;
		let cum = 0;
		const timers = PIPELINE.map((p, i) => {
			cum += p.weight;
			return setTimeout(() => setStageIdx(i + 1), cum / total * perUnit * PIPELINE.length);
		});
		try {
			const r = await runFn({ data: {
				vcName,
				company,
				founder,
				url: urlOrFile,
				deckText,
				thesis
			} });
			setResult(r);
			setStageIdx(PIPELINE.length);
			setShowMemo(true);
			const sector = thesis.sectors[0] || "Unknown";
			const next = [{
				id: `${company}-${Date.now()}`,
				company,
				founder,
				vcName,
				recommendation: r.assessment?.recommendation ?? "diligence",
				founderScore: r.assessment?.founderScore ?? 0,
				trend: r.assessment?.axes.founder.trend ?? "stable",
				updatedAt: Date.now(),
				sector,
				stage: thesis.stage,
				result: r,
				thesis
			}, ...dashRows.filter((x) => x.company !== company)].slice(0, 100);
			setDashRows(next);
			saveDash(next);
		} catch (e) {
			setError(e.message || "Agent run failed");
		} finally {
			timers.forEach(clearTimeout);
			setRunning(false);
		}
	};
	const toggleSector = (s) => {
		setThesisSaved(false);
		const next = {
			...thesis,
			sectors: thesis.sectors.includes(s) ? thesis.sectors.filter((x) => x !== s) : [...thesis.sectors, s]
		};
		setThesis(next);
	};
	const openRow = (r) => {
		setSelectedRow(r);
		setResult(r.result);
		setCompany(r.company);
		setFounder(r.founder);
		setShowMemo(true);
		setTab("inbound");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh",
		style: {
			backgroundColor: INK,
			color: BRAND,
			fontFamily: "Nunito, system-ui, sans-serif"
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "#main",
				className: "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:px-3 focus:py-1 focus:bg-[#DADD98] focus:text-black focus:z-50",
				children: "Skip to main content"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "border-b",
				style: { borderColor: "#DADD9833" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-7xl px-6 py-5 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-9 w-9 flex items-center justify-center font-black text-lg",
							style: {
								backgroundColor: BRAND,
								color: INK,
								fontFamily: "Geist Mono, monospace"
							},
							"aria-hidden": "true",
							children: "VC"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-xl font-black tracking-tight",
							style: { fontFamily: "Rubik, sans-serif" },
							children: "VC BRAIN"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs opacity-70",
							style: { fontFamily: "Geist Mono, monospace" },
							children: "AI-POWERED INVESTMENT ANALYSIS · 24-HOUR DECISION ENGINE"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs opacity-70 hidden md:block",
						style: { fontFamily: "Geist Mono, monospace" },
						children: [
							"v0.2 · ",
							dashRows.length,
							" companies in memory"
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				id: "main",
				className: "mx-auto max-w-7xl px-6 py-8 space-y-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						"aria-label": "Primary",
						className: "flex flex-wrap gap-2",
						children: [
							{
								k: "dashboard",
								label: "DASHBOARD",
								Icon: LayoutDashboard
							},
							{
								k: "inbound",
								label: "ANALYZE · INBOUND",
								Icon: FileText
							},
							{
								k: "radar",
								label: "SOURCING RADAR",
								Icon: Radar
							},
							{
								k: "search",
								label: "FOUNDER SEARCH",
								Icon: Search
							}
						].map(({ k, label, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
							active: tab === k,
							onClick: () => setTab(k),
							Icon,
							children: label
						}, k))
					}),
					tab === "dashboard" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InvestorDashboard, {
						rows: dashRows,
						thesis,
						onOpen: openRow,
						onClear: () => {
							setDashRows([]);
							saveDash([]);
						}
					}),
					tab === "radar" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcingRadar, {
						thesis,
						onAnalyze: (c) => {
							setCompany(c.title.split("/").pop() || c.title);
							setFounder(c.author || "");
							setUrlOrFile(c.url);
							setTab("inbound");
						}
					}),
					tab === "search" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderSearchPanel, {}),
					tab === "inbound" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThesisPanel, {
							thesis,
							setThesis,
							open: thesisOpen,
							setOpen: setThesisOpen,
							saved: thesisSaved,
							onSave: () => {
								saveThesis(thesis);
								setThesisSaved(true);
							},
							toggleSector
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PitchIntake, {
							vcName,
							setVcName,
							company,
							setCompany,
							founder,
							setFounder,
							urlOrFile,
							setUrlOrFile,
							fileName,
							setFileName,
							deckText,
							setDeckText,
							deckMeta,
							setDeckMeta,
							onAnalyze: analyze,
							running
						}),
						(running || stageIdx > 0 && !showMemo) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressIndicator, {
							stageIdx,
							running
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Error" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm",
							style: { fontFamily: "Geist Mono, monospace" },
							children: error
						})] }),
						showMemo && result && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemoView, {
							thesis: selectedRow?.thesis || thesis,
							result,
							allRows: dashRows
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t mt-16",
				style: { borderColor: "#DADD9822" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto max-w-7xl px-6 py-6 text-xs opacity-60",
					style: { fontFamily: "Geist Mono, monospace" },
					children: "VC BRAIN · HACKATHON MVP · EVIDENCE-BACKED DECISIONS IN 24H"
				})
			})
		]
	});
}
function focusRing() {
	return { outlineOffset: 2 };
}
function TabButton({ active, onClick, children, Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		"aria-pressed": active,
		className: "px-4 py-2.5 text-xs font-black tracking-[0.15em] border inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-11",
		style: {
			backgroundColor: active ? BRAND : "transparent",
			color: active ? INK : BRAND,
			borderColor: BRAND,
			fontFamily: "Geist Mono, monospace"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			size: 14,
			"aria-hidden": true
		}), children]
	});
}
function Card({ children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "border p-5 " + className,
		style: {
			borderColor: "#DADD9855",
			backgroundColor: "rgba(218,221,152,0.04)"
		},
		children
	});
}
function SectionLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-[11px] font-bold tracking-[0.2em] uppercase mb-3",
		style: {
			fontFamily: "Geist Mono, monospace",
			color: MUTED
		},
		children
	});
}
function TrendIcon({ trend, size = 14 }) {
	if (trend === "improving") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, {
		size,
		"aria-hidden": true,
		color: OK
	});
	if (trend === "declining") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, {
		size,
		"aria-hidden": true,
		color: BAD
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
		size,
		"aria-hidden": true,
		color: BRAND
	});
}
function TrendChip({ trend }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 text-xs font-bold",
		style: {
			color: trend === "improving" ? OK : trend === "declining" ? BAD : BRAND,
			fontFamily: "Geist Mono, monospace"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendIcon, { trend }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "uppercase tracking-widest",
			children: trend
		})]
	});
}
function RecommendationBadge({ rec, size = "md" }) {
	const s = {
		recommend: {
			bg: OK,
			label: "RECOMMEND INVEST"
		},
		diligence: {
			bg: WARN,
			label: "NEEDS MORE DILIGENCE"
		},
		pass: {
			bg: BAD,
			label: "PASS"
		}
	}[rec];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: size === "sm" ? "px-2 py-1 text-[10px]" : "px-4 py-2 text-sm",
		style: {
			backgroundColor: s.bg,
			color: INK,
			fontFamily: "Rubik, sans-serif",
			fontWeight: 900,
			letterSpacing: "0.05em"
		},
		children: s.label
	});
}
function ThesisFitBadge({ within, reason }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold border",
		style: {
			borderColor: within ? OK : BAD,
			color: within ? OK : BAD,
			fontFamily: "Geist Mono, monospace"
		},
		title: reason,
		children: [within ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
			size: 12,
			"aria-hidden": true
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
			size: 12,
			"aria-hidden": true
		}), within ? "WITHIN THESIS" : "OUTSIDE THESIS"]
	});
}
function InvestorDashboard({ rows, thesis, onOpen, onClear }) {
	const [q, setQ] = (0, import_react.useState)("");
	const [nlLoading, setNlLoading] = (0, import_react.useState)(false);
	const [nlResult, setNlResult] = (0, import_react.useState)(null);
	const [nlErr, setNlErr] = (0, import_react.useState)(null);
	const searchFn = useServerFn(searchFounders);
	const filtered = (0, import_react.useMemo)(() => {
		const s = q.trim().toLowerCase();
		if (!s) return [...rows].sort((a, b) => b.founderScore - a.founderScore);
		return rows.filter((r) => r.company.toLowerCase().includes(s) || r.founder.toLowerCase().includes(s) || r.sector.toLowerCase().includes(s)).sort((a, b) => b.founderScore - a.founderScore);
	}, [rows, q]);
	const runNL = async () => {
		if (!q.trim()) return;
		setNlLoading(true);
		setNlErr(null);
		setNlResult(null);
		try {
			setNlResult(await searchFn({ data: { query: q } }));
		} catch (e) {
			setNlErr(e.message);
		} finally {
			setNlLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Investor Dashboard · Ranked Portfolio" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-end justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl md:text-4xl font-black tracking-tight",
					style: { fontFamily: "Rubik, sans-serif" },
					children: "Deals in memory"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm opacity-80 mt-1",
					children: "Every evaluated company, ranked by Founder Score with live momentum. Click a row to open its memo."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs",
						style: {
							fontFamily: "Geist Mono, monospace",
							color: MUTED
						},
						children: [
							rows.length,
							" companies · thesis: ",
							thesis.sectors.join(", ") || "—",
							" / ",
							thesis.stage
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-col md:flex-row gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex-1 relative",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sr-only",
							children: "Natural-language founder query"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 16,
							"aria-hidden": true,
							className: "absolute left-3 top-1/2 -translate-y-1/2 opacity-70"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: q,
							onChange: (e) => setQ(e.target.value),
							onKeyDown: (e) => e.key === "Enter" && runNL(),
							placeholder: "e.g. \"technical founder, Berlin, AI infra, enterprise traction, no prior VC backing\"",
							className: "w-full pl-10 pr-3 py-3 border bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
							style: {
								borderColor: BRAND,
								color: BRAND,
								...focusRing()
							},
							"aria-label": "Search deals or run natural-language founder query"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: runNL,
					disabled: nlLoading || !q.trim(),
					className: "px-6 py-3 font-black tracking-wider disabled:opacity-40 inline-flex items-center gap-2 min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
					style: {
						backgroundColor: BRAND,
						color: INK,
						fontFamily: "Rubik, sans-serif"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {
						size: 14,
						"aria-hidden": true
					}), nlLoading ? "PARSING…" : "NL SEARCH"]
				})]
			}),
			nlResult && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11px] tracking-widest mb-2",
						style: {
							fontFamily: "Geist Mono, monospace",
							color: MUTED
						},
						children: "PARSED ATTRIBUTES"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							(nlResult.filters.keywords ?? []).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "px-2 py-1 text-[11px] border",
								style: {
									borderColor: BRAND,
									fontFamily: "Geist Mono, monospace"
								},
								children: ["keyword: ", k]
							}, k)),
							nlResult.filters.sector && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "px-2 py-1 text-[11px] border",
								style: {
									borderColor: BRAND,
									fontFamily: "Geist Mono, monospace"
								},
								children: ["sector: ", nlResult.filters.sector]
							}),
							nlResult.filters.geography && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "px-2 py-1 text-[11px] border",
								style: {
									borderColor: BRAND,
									fontFamily: "Geist Mono, monospace"
								},
								children: ["geo: ", nlResult.filters.geography]
							}),
							nlResult.filters.minScore > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "px-2 py-1 text-[11px] border",
								style: {
									borderColor: BRAND,
									fontFamily: "Geist Mono, monospace"
								},
								children: ["score ≥ ", nlResult.filters.minScore]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 space-y-2",
						children: [nlResult.matches.slice(0, 5).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border p-3",
							style: { borderColor: "#DADD9844" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-bold",
									style: { fontFamily: "Rubik, sans-serif" },
									children: m.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs",
									style: {
										fontFamily: "Geist Mono, monospace",
										color: MUTED
									},
									children: [
										m.latestScore != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											"SCORE ",
											Math.round(m.latestScore),
											" · "
										] }),
										"REL ",
										Math.round(m.relevance)
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm opacity-90 mt-1",
								children: m.reason
							})]
						}, m.founderId)), nlResult.matches.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm",
							style: { color: MUTED },
							children: "No founders in memory matched. Run more analyses to build the profile database."
						})]
					})
				]
			}),
			nlErr && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm mt-3",
				style: { color: BAD },
				children: nlErr
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Ranked companies" }), rows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onClear,
				className: "text-[11px] underline opacity-70 hover:opacity-100",
				style: { fontFamily: "Geist Mono, monospace" },
				children: "clear local memory"
			})]
		}), filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-sm py-8 text-center",
			style: { color: MUTED },
			children: [
				"No deals yet. Head to ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-bold",
					style: { color: BRAND },
					children: "ANALYZE · INBOUND"
				}),
				" and run your first company."
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "text-left",
					style: {
						color: MUTED,
						fontFamily: "Geist Mono, monospace"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-[11px] tracking-widest",
							children: "COMPANY"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-[11px] tracking-widest",
							children: "RECOMMENDATION"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-[11px] tracking-widest",
							children: "FOUNDER SCORE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-[11px] tracking-widest",
							children: "MOMENTUM"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-[11px] tracking-widest",
							children: "THESIS"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-[11px] tracking-widest",
							children: "UPDATED"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2 text-[11px] tracking-widest" })
					]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filtered.map((r) => {
					const fit = thesisFit({
						sector: r.sector,
						stage: r.stage
					}, thesis);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t hover:bg-white/5 cursor-pointer",
						style: { borderColor: "#DADD9822" },
						onClick: () => onOpen(r),
						tabIndex: 0,
						onKeyDown: (e) => e.key === "Enter" && onOpen(r),
						role: "button",
						"aria-label": `Open memo for ${r.company}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "py-3 pr-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-bold",
									style: { fontFamily: "Rubik, sans-serif" },
									children: r.company
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs",
									style: {
										color: MUTED,
										fontFamily: "Geist Mono, monospace"
									},
									children: [
										r.founder || "—",
										" · ",
										r.sector
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-3 pr-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecommendationBadge, {
									rec: r.recommendation,
									size: "sm"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "py-3 pr-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-lg font-black",
									style: { fontFamily: "Rubik, sans-serif" },
									children: r.founderScore.toFixed(1)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs opacity-60",
									style: { fontFamily: "Geist Mono, monospace" },
									children: " / 10"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-3 pr-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendChip, { trend: r.trend })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-3 pr-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThesisFitBadge, {
									within: fit.within,
									reason: fit.reason
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-3 pr-3 text-xs",
								style: {
									color: MUTED,
									fontFamily: "Geist Mono, monospace"
								},
								children: new Date(r.updatedAt).toLocaleDateString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
									size: 16,
									"aria-hidden": true
								})
							})
						]
					}, r.id);
				}) })]
			})
		})] })]
	});
}
function ThesisPanel({ thesis, setThesis, open, setOpen, saved, onSave, toggleSector }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: () => setOpen(!open),
		"aria-expanded": open,
		className: "w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Thesis Engine · Config" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl font-black",
				style: { fontFamily: "Rubik, sans-serif" },
				children: "Investment Thesis"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-sm opacity-80 mt-1",
				children: [
					thesis.sectors.join(" · ") || "No sectors",
					" · ",
					thesis.stage,
					" · ",
					thesis.geography,
					" · $",
					thesis.checkMin,
					"–$",
					thesis.checkMax,
					"K · ",
					thesis.ownership,
					"% · ",
					thesis.risk
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-2xl font-mono",
			"aria-hidden": true,
			style: { fontFamily: "Geist Mono, monospace" },
			children: open ? "[ − ]" : "[ + ]"
		})]
	}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 grid grid-cols-1 md:grid-cols-2 gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Sectors" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: SECTORS.map((s) => {
					const active = thesis.sectors.includes(s);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => toggleSector(s),
						"aria-pressed": active,
						className: "px-3 py-2 text-sm font-bold border min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
						style: {
							backgroundColor: active ? BRAND : "transparent",
							color: active ? INK : BRAND,
							borderColor: BRAND,
							fontFamily: "Rubik, sans-serif"
						},
						children: s
					}, s);
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Stage" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value: thesis.stage,
				onChange: (e) => setThesis({
					...thesis,
					stage: e.target.value
				}),
				className: "w-full px-3 py-2 border bg-transparent font-bold min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
				style: {
					borderColor: BRAND,
					color: BRAND,
					fontFamily: "Rubik, sans-serif"
				},
				children: [
					"Pre-seed",
					"Seed",
					"Series A"
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: s,
					style: { backgroundColor: INK },
					children: s
				}, s))
			})] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Geography" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: thesis.geography,
				onChange: (e) => setThesis({
					...thesis,
					geography: e.target.value
				}),
				className: "w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
				style: {
					borderColor: BRAND,
					color: BRAND
				}
			})] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionLabel, { children: [
				"Check size ($",
				thesis.checkMin,
				"K – $",
				thesis.checkMax,
				"K)"
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						"aria-label": "Minimum check size in thousands",
						value: thesis.checkMin,
						onChange: (e) => setThesis({
							...thesis,
							checkMin: +e.target.value
						}),
						className: "w-24 px-3 py-2 border bg-transparent min-h-11",
						style: {
							borderColor: BRAND,
							color: BRAND
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "opacity-60",
						children: "to"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "number",
						"aria-label": "Maximum check size in thousands",
						value: thesis.checkMax,
						onChange: (e) => setThesis({
							...thesis,
							checkMax: +e.target.value
						}),
						className: "w-24 px-3 py-2 border bg-transparent min-h-11",
						style: {
							borderColor: BRAND,
							color: BRAND
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "opacity-60 text-sm",
						children: "K USD"
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Ownership target (%)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "number",
				value: thesis.ownership,
				onChange: (e) => setThesis({
					...thesis,
					ownership: +e.target.value
				}),
				className: "w-32 px-3 py-2 border bg-transparent min-h-11",
				style: {
					borderColor: BRAND,
					color: BRAND
				}
			})] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionLabel, { children: ["Risk appetite · ", thesis.risk] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2",
				children: [
					"Conservative",
					"Balanced",
					"Aggressive"
				].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setThesis({
						...thesis,
						risk: r
					}),
					"aria-pressed": thesis.risk === r,
					className: "flex-1 px-3 py-2 border text-sm font-bold min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
					style: {
						backgroundColor: thesis.risk === r ? BRAND : "transparent",
						color: thesis.risk === r ? INK : BRAND,
						borderColor: BRAND,
						fontFamily: "Rubik, sans-serif"
					},
					children: r
				}, r))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "md:col-span-2 flex items-center gap-4 pt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onSave,
					className: "px-6 py-2.5 font-black tracking-wide min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
					style: {
						backgroundColor: BRAND,
						color: INK,
						fontFamily: "Rubik, sans-serif"
					},
					children: "SAVE THESIS"
				}), saved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-sm inline-flex items-center gap-1.5",
					style: { fontFamily: "Geist Mono, monospace" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
						size: 14,
						color: OK,
						"aria-hidden": true
					}), " Saved locally"]
				})]
			})
		]
	})] });
}
function PitchIntake(props) {
	const hasMin = !!props.company && (!!props.deckMeta || !!props.fileName || !!props.urlOrFile);
	const canSubmit = hasMin && !props.running;
	const parseFn = useServerFn(parseDeck);
	const [deckLoading, setDeckLoading] = (0, import_react.useState)(false);
	const [deckError, setDeckError] = (0, import_react.useState)(null);
	const handleDeck = async (f) => {
		setDeckLoading(true);
		setDeckError(null);
		try {
			const buf = await f.arrayBuffer();
			let binary = "";
			const bytes = new Uint8Array(buf);
			for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
			const base64 = btoa(binary);
			const r = await parseFn({ data: {
				fileName: f.name,
				base64
			} });
			props.setDeckText(r.text);
			props.setDeckMeta({
				fileName: r.fileName,
				pages: r.pages,
				chars: r.chars
			});
		} catch (e) {
			setDeckError(e.message);
		} finally {
			setDeckLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Pitch Intake · Inbound Application" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl font-black",
				style: { fontFamily: "Rubik, sans-serif" },
				children: "New Deal"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs",
				style: {
					color: MUTED,
					fontFamily: "Geist Mono, monospace"
				},
				children: [
					"Only ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						style: { color: BRAND },
						children: "deck + company name"
					}),
					" are required — we'll find the rest."
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "VC firm name (memory key)",
					optional: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.vcName,
						onChange: (e) => props.setVcName(e.target.value),
						placeholder: "Acme Ventures",
						className: "w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
						style: {
							borderColor: BRAND,
							color: BRAND
						}
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Company name",
					required: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.company,
						onChange: (e) => props.setCompany(e.target.value),
						placeholder: "Latchfield AI",
						required: true,
						"aria-required": "true",
						className: "w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
						style: {
							borderColor: BRAND,
							color: BRAND
						}
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Founder name",
					optional: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.founder,
						onChange: (e) => props.setFounder(e.target.value),
						placeholder: "Priya Ramaswamy",
						className: "w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
						style: {
							borderColor: BRAND,
							color: BRAND
						}
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "md:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Company URL",
						optional: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: props.urlOrFile,
							onChange: (e) => props.setUrlOrFile(e.target.value),
							placeholder: "https://latchfield.ai",
							className: "w-full px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
							style: {
								borderColor: BRAND,
								color: BRAND
							}
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "md:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
						label: "Pitch Deck (PDF)",
						required: true,
						helper: "Parsed server-side into memo inputs.",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block border-2 border-dashed p-6 text-center cursor-pointer focus-within:ring-2 focus-within:ring-[#DADD98]",
							style: { borderColor: "#DADD9877" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: "application/pdf",
								className: "sr-only",
								"aria-label": "Upload pitch deck PDF",
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (f) handleDeck(f);
								}
							}), deckLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-sm inline-flex items-center gap-2",
								style: { fontFamily: "Geist Mono, monospace" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
									size: 14,
									className: "animate-spin",
									"aria-hidden": true
								}), " PARSING PDF…"]
							}) : props.deckMeta ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-sm inline-flex items-center gap-2",
								style: { fontFamily: "Geist Mono, monospace" },
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
										size: 14,
										color: OK,
										"aria-hidden": true
									}),
									props.deckMeta.fileName,
									" · ",
									props.deckMeta.pages,
									"p · ",
									props.deckMeta.chars.toLocaleString(),
									" chars"
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-bold",
								style: { fontFamily: "Rubik, sans-serif" },
								children: "Drop deck PDF here"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs opacity-70 mt-1",
								style: { fontFamily: "Geist Mono, monospace" },
								children: "CLICK TO BROWSE · PDF ONLY"
							})] })]
						}), deckError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs mt-2",
							style: {
								color: BAD,
								fontFamily: "Geist Mono, monospace"
							},
							children: deckError
						})]
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				disabled: !canSubmit,
				onClick: props.onAnalyze,
				className: "px-8 py-3 font-black tracking-wider disabled:opacity-40 min-h-11 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
				style: {
					backgroundColor: BRAND,
					color: INK,
					fontFamily: "Rubik, sans-serif"
				},
				children: props.running ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
					size: 16,
					className: "animate-spin",
					"aria-hidden": true
				}), " ANALYZING…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["ANALYZE ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
					size: 16,
					"aria-hidden": true
				})] })
			}), !hasMin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs",
				style: {
					color: MUTED,
					fontFamily: "Geist Mono, monospace"
				},
				children: "Add a company name and a deck (or URL) to enable analysis."
			})]
		})
	] });
}
function Field({ label, required, optional, helper, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 mb-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-bold tracking-[0.2em] uppercase",
					style: {
						fontFamily: "Geist Mono, monospace",
						color: MUTED
					},
					children: label
				}),
				required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] font-bold px-1.5 py-0.5",
					style: {
						backgroundColor: BRAND,
						color: INK,
						fontFamily: "Geist Mono, monospace"
					},
					children: "REQUIRED"
				}),
				optional && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px]",
					style: {
						color: MUTED,
						fontFamily: "Geist Mono, monospace"
					},
					children: "· optional"
				})
			]
		}),
		children,
		helper && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[11px] mt-1.5",
			style: {
				color: MUTED,
				fontFamily: "Geist Mono, monospace"
			},
			children: helper
		})
	] });
}
function ProgressIndicator({ stageIdx, running }) {
	const totalWeight = PIPELINE.reduce((s, p) => s + p.weight, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Pipeline · Live agent run" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-4 h-1 w-full",
			style: { backgroundColor: "#DADD9822" },
			children: (() => {
				const done = PIPELINE.slice(0, stageIdx).reduce((s, p) => s + p.weight, 0);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full transition-all",
					style: {
						width: Math.min(100, done / totalWeight * 100) + "%",
						backgroundColor: BRAND
					}
				});
			})()
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-1 md:grid-cols-5 gap-2",
			children: PIPELINE.map((p, i) => {
				const done = i < stageIdx;
				const active = i === stageIdx - 1 && running;
				const flex = p.weight;
				const Icon = done ? CircleCheck : active ? LoaderCircle : Circle;
				const color = done ? OK : active ? BRAND : MUTED;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border p-3",
					style: {
						borderColor: "#DADD9844",
						flex,
						opacity: done || active ? 1 : .6
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								size: 16,
								color,
								"aria-hidden": true,
								className: active ? "animate-spin" : ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-bold tracking-widest",
								style: {
									fontFamily: "Geist Mono, monospace",
									color
								},
								children: p.agent.toUpperCase()
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs mt-1.5",
							style: { fontFamily: "Geist Mono, monospace" },
							children: p.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[10px] mt-1",
							style: {
								color: MUTED,
								fontFamily: "Geist Mono, monospace"
							},
							children: [
								"weight ",
								p.weight,
								"× ",
								p.key === "screening" ? "· fast filter" : p.key === "diligence" ? "· deep verify" : ""
							]
						})
					]
				}, p.key);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 text-[11px]",
			style: {
				color: MUTED,
				fontFamily: "Geist Mono, monospace"
			},
			children: "Screening is the fast first-pass filter; Diligence is the heavier verification loop that runs after screening approves."
		})
	] });
}
function MemoView({ thesis, result, allRows }) {
	const a = result.assessment;
	const [lens, setLens] = (0, import_react.useState)("bull");
	const [pdfBusy, setPdfBusy] = (0, import_react.useState)(false);
	const downloadPdf = async () => {
		if (pdfBusy) return;
		setPdfBusy(true);
		try {
			const [{ default: jsPDF }, { toCanvas }] = await Promise.all([import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t())), import("../_libs/html-to-image.mjs").then((n) => n.t)]);
			const el = document.getElementById("memo-export");
			if (!el) return;
			const canvas = await toCanvas(el, {
				backgroundColor: INK,
				pixelRatio: 2,
				cacheBust: true
			});
			const img = canvas.toDataURL("image/png");
			const pdf = new jsPDF({
				orientation: "p",
				unit: "pt",
				format: "a4"
			});
			const pageW = pdf.internal.pageSize.getWidth();
			const pageH = pdf.internal.pageSize.getHeight();
			const imgW = pageW;
			const imgH = canvas.height * imgW / canvas.width;
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
			alert("PDF export failed: " + (e?.message || "unknown error"));
		} finally {
			setPdfBusy(false);
		}
	};
	if (!a) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Assessment failed" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm opacity-90",
			children: "The Assessment agent could not produce structured output. Raw sourcing findings:"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "text-xs mt-3 whitespace-pre-wrap opacity-90",
			style: { fontFamily: "Geist Mono, monospace" },
			children: result.sourcingRaw
		})
	] });
	const sameSector = allRows.filter((r) => r.sector && thesis.sectors[0] && r.sector.toLowerCase() === thesis.sectors[0].toLowerCase());
	const portfolioCheck = sameSector.length >= 2 ? {
		warn: true,
		text: `Fund already holds ${sameSector.length} ${thesis.sectors[0]} ${thesis.stage.toLowerCase()} position(s) — this would be the ${sameSector.length + 1}${[
			"st",
			"nd",
			"rd"
		][sameSector.length] ?? "th"}. Concentration risk elevated.`
	} : {
		warn: false,
		text: `Fund holds ${sameSector.length} ${thesis.sectors[0] || "matching"} ${thesis.stage.toLowerCase()} position(s). No concentration risk at this size.`
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-end gap-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: downloadPdf,
				disabled: pdfBusy,
				className: "px-5 py-2.5 font-black tracking-wider min-h-11 inline-flex items-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
				style: {
					backgroundColor: BRAND,
					color: INK,
					fontFamily: "Rubik, sans-serif"
				},
				children: pdfBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
					size: 16,
					className: "animate-spin",
					"aria-hidden": true
				}), " EXPORTING…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "↓ DOWNLOAD PDF" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			id: "memo-export",
			className: "space-y-6",
			style: { backgroundColor: INK },
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemoHeader, {
					company: result.company,
					a,
					thesis
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DecisionBar, {
					a,
					portfolioCheck,
					thesis
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreCards, {
					a,
					founderName: result.founder || "Founder"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AxesRow, { a }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColdStartBanner, {
					cold: result.coldStart,
					history: result.founderScoreHistory,
					founderName: result.founder || ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between flex-wrap gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Adversarial View · Bull vs. Bear" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						role: "tablist",
						"aria-label": "Adversarial lens",
						className: "inline-flex border",
						style: { borderColor: BRAND },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LensBtn, {
							active: lens === "bull",
							onClick: () => setLens("bull"),
							children: "BULL CASE"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LensBtn, {
							active: lens === "bear",
							onClick: () => setLens("bear"),
							children: "BEAR CASE"
						})]
					})]
				}), lens === "bull" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubCard, {
						title: "Investment Hypotheses",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-2 text-sm",
							children: a.hypotheses.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { color: BRAND },
									children: "▸"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: h })]
							}, h))
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubCard, {
						title: "Strengths + Opportunities",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-2 text-sm",
							children: [...a.strengths, ...a.opportunities].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
									size: 14,
									color: OK,
									"aria-hidden": true,
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: h })]
							}, h))
						})
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubCard, {
						title: "Devil's Advocate",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm leading-relaxed",
							children: a.disagreement || "No strong counter-argument identified."
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubCard, {
						title: "Weaknesses + Risks",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-2 text-sm",
							children: [...a.weaknesses, ...a.risks].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
									size: 14,
									color: WARN,
									"aria-hidden": true,
									className: "mt-1"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: h })]
							}, h))
						})
					})]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Company Snapshot" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm leading-relaxed",
						children: a.snapshot
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Problem & Product" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm leading-relaxed",
						children: a.problemAndProduct || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { color: MUTED },
							children: "Not disclosed."
						})
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Traction, { a }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SWOT, { a }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Claims, { a }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gaps, { a }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Agent Trace · Live Run" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1 text-xs",
						style: { fontFamily: "Geist Mono, monospace" },
						children: result.trace.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "opacity-90",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									style: { color: BRAND },
									children: [
										"[",
										t.agent,
										"]"
									]
								}),
								" ",
								t.step,
								t.detail ? ` — ${t.detail}` : ""
							]
						}, i))
					}),
					result.priorMemoryUsed.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 text-xs inline-flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, {
								size: 14,
								color: BRAND,
								"aria-hidden": true
							}),
							" Reused ",
							result.priorMemoryUsed.length,
							" prior note(s) from VC memory."
						]
					})
				] })
			]
		})]
	});
}
function LensBtn({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		role: "tab",
		"aria-selected": active,
		onClick,
		className: "px-4 py-2 text-xs font-black tracking-widest min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
		style: {
			backgroundColor: active ? BRAND : "transparent",
			color: active ? INK : BRAND,
			fontFamily: "Geist Mono, monospace"
		},
		children
	});
}
function SubCard({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border p-4",
		style: { borderColor: "#DADD9844" },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[11px] font-bold tracking-[0.2em] uppercase mb-2",
			style: {
				fontFamily: "Geist Mono, monospace",
				color: MUTED
			},
			children: title
		}), children]
	});
}
function DecisionBar({ a, portfolioCheck, thesis }) {
	const trust = a.claims.length > 0 ? Math.round(100 * a.claims.filter((c) => c.trust === "verified").length / a.claims.length) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Investment Decision · $100K in 24h" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm inline-flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, {
							size: 14,
							color: portfolioCheck.warn ? WARN : BRAND,
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { color: portfolioCheck.warn ? WARN : BRAND },
							children: "Portfolio check:"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "opacity-90",
							children: portfolioCheck.text
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs mt-1",
					style: {
						color: MUTED,
						fontFamily: "Geist Mono, monospace"
					},
					children: [
						"Thesis: ",
						thesis.sectors.join(", "),
						" · ",
						thesis.stage,
						" · check $",
						thesis.checkMin,
						"–$",
						thesis.checkMax,
						"K"
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border px-4 py-2 text-center",
				style: { borderColor: BRAND },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[10px] tracking-widest",
					style: {
						fontFamily: "Geist Mono, monospace",
						color: MUTED
					},
					children: "TRUST SCORE"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-2xl font-black",
					style: { fontFamily: "Rubik, sans-serif" },
					children: [trust, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs opacity-60",
						children: " / 100"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecommendationBadge, { rec: a.recommendation })]
		})]
	}) });
}
function MemoHeader({ company, a, thesis }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "!p-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col md:flex-row md:items-start justify-between gap-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Investment Memo" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-4xl md:text-5xl font-black tracking-tight",
					style: { fontFamily: "Rubik, sans-serif" },
					children: company
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-lg opacity-90 mt-2",
					children: a.thesisFitNote
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-start md:items-end gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecommendationBadge, { rec: a.recommendation }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThesisFitBadge, {
					within: a.thesisFit,
					reason: a.thesisFit ? `Matches ${thesis.sectors.join(", ")}` : `fund targets ${thesis.sectors.join(", ") || "—"}`
				})]
			})]
		})
	});
}
function ScoreCards({ a, founderName }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-1 md:grid-cols-3 gap-4",
		children: [
			{
				label: "Founder",
				score: a.founderScore,
				detail: a.founderBlurb,
				sub: founderName,
				verdict: null
			},
			{
				label: "Company Reputation",
				score: a.companyReputationScore,
				detail: "Signal from Reddit + web sources.",
				sub: "",
				verdict: null
			},
			{
				label: "Risk",
				score: a.riskScore,
				detail: a.shouldInvest ? "Risk verdict: acceptable." : "Risk verdict: elevated.",
				sub: "",
				verdict: a.shouldInvest ? "acceptable" : "elevated"
			}
		].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SectionLabel, { children: [c.label, " Score"] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-5xl font-black",
					style: {
						fontFamily: "Rubik, sans-serif",
						color: BRAND
					},
					children: c.score.toFixed(1)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs opacity-70",
					style: { fontFamily: "Geist Mono, monospace" },
					children: "/ 10"
				})]
			}),
			c.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-bold mt-2",
				style: { fontFamily: "Rubik, sans-serif" },
				children: c.sub
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs mt-2 leading-relaxed",
				style: { color: MUTED },
				children: c.detail
			})
		] }, c.label))
	});
}
function AxesRow({ a }) {
	const cells = [
		{
			label: "Founder",
			score: a.axes.founder.score,
			trend: a.axes.founder.trend,
			chip: null,
			note: a.axes.founder.rationale
		},
		{
			label: "Market",
			score: a.axes.market.score,
			trend: a.axes.market.trend,
			chip: a.axes.market.stance.toUpperCase(),
			note: a.axes.market.rationale
		},
		{
			label: "Idea vs. Market",
			score: a.axes.ideaVsMarket.score,
			trend: a.axes.ideaVsMarket.trend,
			chip: a.axes.ideaVsMarket.survivesAsIs ? "SURVIVES AS-IS" : "PIVOT LIKELY",
			note: a.axes.ideaVsMarket.rationale
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mb-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "3-Axis Screening · scores kept separate" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-1 md:grid-cols-3 gap-4",
		children: cells.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: c.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendChip, { trend: c.trend })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline gap-3 mt-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-5xl font-black",
					style: {
						fontFamily: "Rubik, sans-serif",
						color: BRAND
					},
					children: c.score.toFixed(1)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs opacity-70",
					style: { fontFamily: "Geist Mono, monospace" },
					children: "/ 10"
				})]
			}),
			c.chip && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 inline-block px-2 py-1 text-[10px] font-black tracking-widest border",
				style: {
					borderColor: BRAND,
					fontFamily: "Geist Mono, monospace"
				},
				children: c.chip
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs mt-2 leading-relaxed",
				style: { color: MUTED },
				children: c.note
			})
		] }, c.label))
	})] });
}
function ColdStartBanner({ cold, history, founderName }) {
	if (!cold.active && history.length === 0) return null;
	const known = !cold.active && history.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col md:flex-row md:items-center justify-between gap-4 -m-1 p-4",
		style: {
			borderLeft: `4px solid ${known ? OK : "#60a5fa"}`,
			backgroundColor: known ? "rgba(34,197,94,0.06)" : "rgba(96,165,250,0.06)"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] font-bold tracking-[0.2em] uppercase mb-1 inline-flex items-center gap-2",
				style: {
					fontFamily: "Geist Mono, monospace",
					color: known ? OK : "#60a5fa"
				},
				children: known ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, {
					size: 14,
					"aria-hidden": true
				}), " KNOWN FOUNDER"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Snowflake, {
					size: 14,
					"aria-hidden": true
				}), " COLD-START FOUNDER"] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-lg font-bold",
				style: { fontFamily: "Rubik, sans-serif" },
				children: founderName || "Founder"
			}),
			cold.active && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs mt-1",
				style: {
					fontFamily: "Geist Mono, monospace",
					color: MUTED
				},
				children: [
					"confidence ",
					(cold.confidence * 100).toFixed(0),
					"% · ",
					cold.note
				]
			}),
			known && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs mt-1",
				style: {
					fontFamily: "Geist Mono, monospace",
					color: MUTED
				},
				children: [history.length, " score snapshot(s) on file · Founder Score is persistent across your fund's applications."]
			})
		] }), history.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-end gap-2",
			"aria-label": "Founder score history",
			children: history.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-6",
					style: {
						height: `${Math.max(6, s / 2)}px`,
						backgroundColor: BRAND,
						opacity: i === history.length - 1 ? 1 : .5
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[10px] mt-1",
					style: {
						fontFamily: "Geist Mono, monospace",
						color: MUTED
					},
					children: Math.round(s)
				})]
			}, i))
		})]
	}) });
}
function SWOT({ a }) {
	const cells = [
		["Strengths", a.strengths],
		["Weaknesses", a.weaknesses],
		["Opportunities", a.opportunities],
		["Risks", a.risks]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mb-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "SWOT" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-4",
		children: cells.map(([label, items]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs font-bold tracking-widest mb-3",
			style: {
				fontFamily: "Geist Mono, monospace",
				color: MUTED
			},
			children: label.toUpperCase()
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2 text-sm",
			children: items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-start gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					children: "▸"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex-1",
					children: it
				})]
			}, it))
		})] }, label))
	})] });
}
function Claims({ a }) {
	const styles = {
		verified: {
			bg: OK,
			Icon: CircleCheck,
			label: "VERIFIED"
		},
		unverified: {
			bg: WARN,
			Icon: TriangleAlert,
			label: "UNVERIFIED"
		},
		contradicted: {
			bg: BAD,
			Icon: Flag,
			label: "CONTRADICTED"
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mb-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Claims & Trust · Validator-checked" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: a.claims.map((c, i) => {
			const s = styles[c.trust];
			const Icon = s.Icon;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-start gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inline-flex items-center gap-1.5 px-3 py-2 font-black text-xs tracking-wider whitespace-nowrap self-start",
					style: {
						backgroundColor: s.bg,
						color: INK,
						fontFamily: "Rubik, sans-serif"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							size: 14,
							"aria-hidden": true
						}),
						" ",
						s.label
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-base font-bold",
							style: { fontFamily: "Rubik, sans-serif" },
							children: [
								"“",
								c.text,
								"”"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm mt-2 opacity-90",
							children: c.evidence
						}),
						c.evidenceUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: c.evidenceUrl,
							target: "_blank",
							rel: "noreferrer",
							className: "text-xs underline mt-1 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
							style: {
								color: BRAND,
								fontFamily: "Geist Mono, monospace"
							},
							children: ["↗ ", c.evidenceUrl.slice(0, 70)]
						})
					]
				})]
			}) }, i);
		})
	})] });
}
function Traction({ a }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Traction & KPIs" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3",
		children: [a.tractionKPIs.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border p-3",
			style: { borderColor: "#DADD9833" },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] tracking-widest",
				style: {
					fontFamily: "Geist Mono, monospace",
					color: MUTED
				},
				children: k.label.toUpperCase()
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-lg font-black mt-1",
				style: {
					fontFamily: "Rubik, sans-serif",
					color: k.disclosed ? BRAND : MUTED
				},
				children: k.disclosed ? k.value : "not disclosed"
			})]
		}, k.label)), a.tractionKPIs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "col-span-full text-sm",
			style: { color: MUTED },
			children: "No KPIs disclosed."
		})]
	})] });
}
function Gaps({ a }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-2 border-dashed p-6",
		style: {
			borderColor: "#c9ccb077",
			backgroundColor: "rgba(255,255,255,0.02)"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 mb-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, {
					size: 14,
					color: MUTED,
					"aria-hidden": true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs font-bold tracking-[0.2em] uppercase",
					style: {
						fontFamily: "Geist Mono, monospace",
						color: MUTED
					},
					children: "Disclosed Gaps · Not Available"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px]",
					style: {
						color: MUTED,
						fontFamily: "Geist Mono, monospace"
					},
					title: "These are gaps the model explicitly flagged rather than guessed.",
					children: "(hover: what is this?)"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-1.5 text-sm",
			style: { color: MUTED },
			children: a.gaps.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				style: { fontFamily: "Geist Mono, monospace" },
				children: ["— ", g]
			}, g))
		})]
	});
}
function SourcingRadar({ thesis, onAnalyze }) {
	const [keyword, setKeyword] = (0, import_react.useState)("");
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [scan, setScan] = (0, import_react.useState)(null);
	const [err, setErr] = (0, import_react.useState)(null);
	const [outreach, setOutreach] = (0, import_react.useState)({});
	const scanFn = useServerFn(scanOutbound);
	(0, import_react.useEffect)(() => {
		setOutreach(loadOutreach());
	}, []);
	const activate = (c) => {
		const next = {
			...outreach,
			[c.url]: Date.now()
		};
		setOutreach(next);
		saveOutreach(next);
	};
	const run = async () => {
		setScanning(true);
		setErr(null);
		try {
			setScan(await scanFn({ data: {
				sectors: thesis.sectors,
				stage: thesis.stage,
				geography: thesis.geography,
				keyword
			} }));
		} catch (e) {
			setErr(e.message);
		} finally {
			setScanning(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Outbound · Sourcing Radar" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-2xl font-black mb-3",
			style: { fontFamily: "Rubik, sans-serif" },
			children: "Find founders before they apply"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm opacity-90 mb-4",
			children: [
				"Scans HackerNews, GitHub (100★+), and arXiv for candidates aligned with your thesis. ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Analyze" }),
				" pulls a candidate into the memo pipeline; ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Activate" }),
				" queues cold outreach to convert them into inbound."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col md:flex-row gap-3 mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: keyword,
				onChange: (e) => setKeyword(e.target.value),
				placeholder: "Extra keyword (e.g. guardrails, vector db, edge compute)",
				className: "flex-1 px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
				style: {
					borderColor: BRAND,
					color: BRAND
				},
				"aria-label": "Sourcing radar keyword"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: run,
				disabled: scanning,
				className: "px-6 py-2 font-black tracking-wider disabled:opacity-40 min-h-11 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
				style: {
					backgroundColor: BRAND,
					color: INK,
					fontFamily: "Rubik, sans-serif"
				},
				children: scanning ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
					size: 14,
					className: "animate-spin",
					"aria-hidden": true
				}), " SCANNING…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["SCAN NOW ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
					size: 14,
					"aria-hidden": true
				})] })
			})]
		}),
		err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-sm mb-3",
			style: { color: BAD },
			children: err
		}),
		scan && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-xs mb-3",
			style: {
				fontFamily: "Geist Mono, monospace",
				color: MUTED
			},
			children: [
				"Q: “",
				scan.query,
				"” · keywords: [",
				scan.keywords.join(", "),
				"] · HN:",
				scan.counts.hackernews,
				" · GH:",
				scan.counts.github,
				" · arXiv:",
				scan.counts.arxiv,
				" · relevant ",
				scan.relevantCount,
				"/",
				scan.counts.hackernews + scan.counts.github + scan.counts.arxiv
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3",
			children: [scan.candidates.map((c, i) => {
				const strong = c.signalScore >= .6;
				const activated = !!outreach[c.url];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border p-4 flex flex-col md:flex-row md:items-start justify-between gap-3",
					style: {
						borderColor: BRAND + (strong ? "aa" : "33"),
						opacity: strong ? 1 : .75
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 flex-wrap",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "px-2 py-0.5 text-[10px] font-black tracking-widest inline-flex items-center gap-1",
										style: {
											backgroundColor: BRAND,
											color: INK,
											fontFamily: "Geist Mono, monospace"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, {
											size: 10,
											"aria-hidden": true
										}), c.source.toUpperCase()]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: c.url,
										target: "_blank",
										rel: "noreferrer",
										className: "font-bold underline truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
										style: {
											fontFamily: "Rubik, sans-serif",
											color: BRAND
										},
										children: c.title
									}),
									c.author && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs",
										style: {
											color: MUTED,
											fontFamily: "Geist Mono, monospace"
										},
										children: ["· ", c.author]
									}),
									activated && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold",
										style: {
											backgroundColor: OK,
											color: INK,
											fontFamily: "Geist Mono, monospace"
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
											size: 10,
											"aria-hidden": true
										}), " OUTREACH SENT"]
									})
								]
							}),
							c.snippet && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm mt-1 opacity-90",
								children: c.snippet
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[11px] mt-2 inline-flex items-center gap-2",
								style: { fontFamily: "Geist Mono, monospace" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "px-1.5 py-0.5 border",
									style: {
										borderColor: strong ? BRAND : MUTED,
										color: strong ? BRAND : MUTED
									},
									children: [
										"REL ",
										(c.signalScore * 100).toFixed(0),
										"/100 ",
										strong ? "· strong" : "· weak"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									style: { color: MUTED },
									children: ["· ", c.signals.join(" · ")]
								})]
							}),
							c.relevanceReason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs mt-1",
								style: { color: MUTED },
								children: ["↳ ", c.relevanceReason]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex md:flex-col gap-2 shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onAnalyze(c),
							"aria-label": `Analyze ${c.title}`,
							className: "px-4 py-2 text-xs font-black tracking-widest border whitespace-nowrap min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
							style: {
								borderColor: BRAND,
								color: BRAND,
								fontFamily: "Geist Mono, monospace"
							},
							children: "ANALYZE →"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => activate(c),
							disabled: activated,
							"aria-label": `Activate outreach to ${c.title}`,
							className: "px-4 py-2 text-xs font-black tracking-widest whitespace-nowrap min-h-11 inline-flex items-center gap-1.5 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
							style: {
								backgroundColor: BRAND,
								color: INK,
								fontFamily: "Geist Mono, monospace"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
								size: 12,
								"aria-hidden": true
							}), activated ? "QUEUED" : "ACTIVATE"]
						})]
					})]
				}, i);
			}), scan.candidates.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-sm",
				style: { color: MUTED },
				children: [
					"No strong matches found. Fetched ",
					scan.counts.hackernews + scan.counts.github + scan.counts.arxiv,
					" raw results across sources, but none scored ≥35 relevance for this thesis. Try different keywords."
				]
			})]
		})] })
	] });
}
function FounderSearchPanel() {
	const [query, setQuery] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [err, setErr] = (0, import_react.useState)(null);
	const [result, setResult] = (0, import_react.useState)(null);
	const searchFn = useServerFn(searchFounders);
	const run = async () => {
		if (!query.trim()) return;
		setLoading(true);
		setErr(null);
		try {
			setResult(await searchFn({ data: { query } }));
		} catch (e) {
			setErr(e.message);
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Founder Search · Natural-Language Query" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-2xl font-black mb-3",
			style: { fontFamily: "Rubik, sans-serif" },
			children: "Query the founder memory"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm opacity-90 mb-4",
			children: "Ask in plain English — the LLM parses filters and ranks matches from your persistent founder profiles (scores, signals, prior screenings)."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col md:flex-row gap-3 mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: query,
				onChange: (e) => setQuery(e.target.value),
				onKeyDown: (e) => e.key === "Enter" && run(),
				placeholder: "e.g. \"technical founder, Berlin, AI infra, enterprise traction, no prior VC backing\"",
				className: "flex-1 px-3 py-2 border bg-transparent min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98]",
				style: {
					borderColor: BRAND,
					color: BRAND
				},
				"aria-label": "Natural language founder query"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: run,
				disabled: loading || !query.trim(),
				className: "px-6 py-2 font-black tracking-wider disabled:opacity-40 min-h-11 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DADD98] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
				style: {
					backgroundColor: BRAND,
					color: INK,
					fontFamily: "Rubik, sans-serif"
				},
				children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
					size: 14,
					className: "animate-spin",
					"aria-hidden": true
				}), " SEARCHING…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["SEARCH ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
					size: 14,
					"aria-hidden": true
				})] })
			})]
		}),
		err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-sm mb-3",
			style: { color: BAD },
			children: err
		}),
		result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] tracking-widest mb-2",
				style: {
					fontFamily: "Geist Mono, monospace",
					color: MUTED
				},
				children: "PARSED ATTRIBUTES"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					result.filters.keywords.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "px-2 py-1 text-[11px] border",
						style: {
							borderColor: BRAND,
							fontFamily: "Geist Mono, monospace"
						},
						children: ["keyword: ", k]
					}, k)),
					result.filters.sector && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "px-2 py-1 text-[11px] border",
						style: {
							borderColor: BRAND,
							fontFamily: "Geist Mono, monospace"
						},
						children: ["sector: ", result.filters.sector]
					}),
					result.filters.geography && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "px-2 py-1 text-[11px] border",
						style: {
							borderColor: BRAND,
							fontFamily: "Geist Mono, monospace"
						},
						children: ["geo: ", result.filters.geography]
					}),
					result.filters.minScore > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "px-2 py-1 text-[11px] border",
						style: {
							borderColor: BRAND,
							fontFamily: "Geist Mono, monospace"
						},
						children: ["score ≥ ", result.filters.minScore]
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3",
			children: [result.matches.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border p-4",
				style: { borderColor: "#DADD9844" },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3 flex-wrap",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-bold text-lg",
							style: { fontFamily: "Rubik, sans-serif" },
							children: m.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 text-xs",
							style: { fontFamily: "Geist Mono, monospace" },
							children: [
								m.latestScore != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"SCORE ",
									Math.round(m.latestScore),
									"/100"
								] }),
								m.trend && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendChip, { trend: m.trend }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "px-2 py-0.5",
									style: {
										backgroundColor: BRAND,
										color: INK
									},
									children: ["REL ", Math.round(m.relevance)]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm mt-2 opacity-90",
						children: m.reason
					}),
					m.rationale && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs mt-1 italic",
						style: { color: MUTED },
						children: m.rationale
					}),
					m.signals.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[11px] mt-2",
						style: {
							fontFamily: "Geist Mono, monospace",
							color: MUTED
						},
						children: ["signals: ", m.signals.map((s) => s.snippet.slice(0, 60)).join(" · ")]
					}),
					m.screenings.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[11px] mt-1",
						style: {
							fontFamily: "Geist Mono, monospace",
							color: MUTED
						},
						children: ["prior screenings: ", m.screenings.map((s) => `${s.company}→${s.recommendation}`).join(" · ")]
					})
				]
			}, m.founderId)), result.matches.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm",
				style: { color: MUTED },
				children: "No founders in memory matched this query. Run some analyses first to build the founder database."
			})]
		})] })
	] });
}
//#endregion
export { VCBrain as component };
