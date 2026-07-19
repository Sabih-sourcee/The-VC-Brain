//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-DbSJViW4.js
var manifest = {
	"13681914ed0c9657fa5d85c47b782c575657738647e482f375f5d1a012356510": {
		functionName: "runAnalysis_createServerFn_handler",
		importer: () => import("./_ssr/agents.functions-D2xQAFnH.mjs")
	},
	"555eb6387865ed56ff2bc65b4f9ba61f40063273b85495f05747803874ad3952": {
		functionName: "searchFounders_createServerFn_handler",
		importer: () => import("./_ssr/founders.functions-B8Qcjjh1.mjs")
	},
	"6778bfffdd218c4cdb75df17a950a04838202dbc31830e0c1a55d3f1a3fd71d9": {
		functionName: "parseDeck_createServerFn_handler",
		importer: () => import("./_ssr/deck.functions-D2UliikL.mjs")
	},
	"a4a9ff656d01f951d1d127b3df5142dda40742466a19c214d44efa4c956d0129": {
		functionName: "scanOutbound_createServerFn_handler",
		importer: () => import("./_ssr/outbound.functions-Hq-txqJL.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
