/**
 * Public serverFn contract for inbound analysis.
 * Internals: LangGraph StateGraph in agents.graph.ts.
 * Do not change request/response shapes — the React UI depends on them.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  vcName: z.string().min(1),
  company: z.string().min(1),
  founder: z.string().default(""),
  url: z.string().default(""),
  deckText: z.string().default(""),
  thesis: z.object({
    sectors: z.array(z.string()),
    stage: z.string(),
    geography: z.string(),
    checkMin: z.number(),
    checkMax: z.number(),
    ownership: z.number(),
    risk: z.string(),
  }),
});

export const runAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    // Dynamic import keeps LangGraph / service-role deps out of the client bundle.
    const { runAnalysisGraph } = await import("./agents.graph");
    return runAnalysisGraph(data);
  });

export type RunAnalysisResult = Awaited<ReturnType<typeof runAnalysis>>;
