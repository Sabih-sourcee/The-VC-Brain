import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  fileName: z.string(),
  base64: z.string().min(10),
});

export const parseDeck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { extractText, getDocumentProxy } = await import("unpdf");
    // Strip data URL prefix if present
    const b64 = data.base64.replace(/^data:.*?;base64,/, "");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pdf = await getDocumentProxy(bytes);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join("\n\n") : text;
    return {
      fileName: data.fileName,
      pages: totalPages,
      chars: merged.length,
      text: merged.slice(0, 20000),
    };
  });

export type ParseDeckResult = Awaited<ReturnType<typeof parseDeck>>;