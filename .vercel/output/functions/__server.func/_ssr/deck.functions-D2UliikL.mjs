import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.mjs";
import { ft as object, ht as string } from "../_libs/@ai-sdk/gateway+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deck.functions-D2UliikL.js
var InputSchema = object({
	fileName: string(),
	base64: string().min(10)
});
var parseDeck_createServerFn_handler = createServerRpc({
	id: "6778bfffdd218c4cdb75df17a950a04838202dbc31830e0c1a55d3f1a3fd71d9",
	name: "parseDeck",
	filename: "src/lib/deck.functions.ts"
}, (opts) => parseDeck.__executeServer(opts));
var parseDeck = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema.parse(input)).handler(parseDeck_createServerFn_handler, async ({ data }) => {
	const { extractText, getDocumentProxy } = await import("../_libs/unpdf.mjs").then((n) => n.t);
	const b64 = data.base64.replace(/^data:.*?;base64,/, "");
	const { text, totalPages } = await extractText(await getDocumentProxy(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))), { mergePages: true });
	const merged = Array.isArray(text) ? text.join("\n\n") : text;
	return {
		fileName: data.fileName,
		pages: totalPages,
		chars: merged.length,
		text: merged.slice(0, 2e4)
	};
});
//#endregion
export { parseDeck_createServerFn_handler };
