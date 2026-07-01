import { createStateStore } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { useEffect, useMemo, useState } from "react";
import type { KaraokeScore } from "./ui/catalog";
import { functions } from "./ui/functions";
import { registry } from "./ui/registry";
import { spec } from "./ui/spec";

const initialState = {
	scores: [] as KaraokeScore[],
	loading: true,
	error: "",
	searchTerm: "",
	minScore: 0,
	viewMode: "songs",
	sortKey: "score",
	sortDirection: "desc",
	artistSortKey: "avgScore",
	artistSortDirection: "desc",
};

/**
 * The UI is a static json-render spec (see ./ui/spec.ts) rendered against a
 * catalog of registered components. All interactivity flows through the
 * json-render state store: inputs two-way bind via `$bindState`, buttons emit
 * events routed to the `handlers` below, and derived data comes from `$computed`
 * functions.
 */
function App() {
	const store = useState(() => createStateStore(initialState))[0];

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const response = await fetch("/scores.json");
				if (!response.ok) throw new Error("Failed to load scores");
				const data: KaraokeScore[] = await response.json();
				if (!cancelled)
					store.update({ "/scores": data, "/loading": false, "/error": "" });
			} catch (err) {
				console.error("Error loading scores:", err);
				if (!cancelled)
					store.update({
						"/loading": false,
						"/error": "データを読み込めませんでした",
					});
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [store]);

	const handlers = useMemo(
		() => ({
			setViewMode: (params: Record<string, unknown>) => {
				store.set("/viewMode", String(params.mode));
			},
			sortScores: (params: Record<string, unknown>) => {
				const key = String(params.key);
				const current = store.get("/sortKey");
				if (current === key) {
					const dir = store.get("/sortDirection");
					store.set("/sortDirection", dir === "asc" ? "desc" : "asc");
				} else {
					store.update({
						"/sortKey": key,
						"/sortDirection": key === "score" ? "desc" : "asc",
					});
				}
			},
			sortArtists: (params: Record<string, unknown>) => {
				const key = String(params.key);
				const current = store.get("/artistSortKey");
				if (current === key) {
					const dir = store.get("/artistSortDirection");
					store.set("/artistSortDirection", dir === "asc" ? "desc" : "asc");
				} else {
					store.update({
						"/artistSortKey": key,
						"/artistSortDirection": key === "artist" ? "asc" : "desc",
					});
				}
			},
		}),
		[store],
	);

	return (
		<JSONUIProvider
			registry={registry}
			store={store}
			handlers={handlers}
			functions={functions}
		>
			<Renderer spec={spec} registry={registry} />
		</JSONUIProvider>
	);
}

export default App;
