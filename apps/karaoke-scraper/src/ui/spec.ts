import type { SingleCondition } from "@json-render/core";
import type { Spec } from "@json-render/react";

/** Shown only while data is loading. */
const whenLoading: SingleCondition = { $state: "/loading" };
/** Shown only once data has loaded successfully. */
const whenReady: SingleCondition[] = [
	{ $state: "/loading", not: true },
	{ $state: "/error", not: true },
];
/** Shown only when loading finished with an error. */
const whenError: SingleCondition[] = [
	{ $state: "/loading", not: true },
	{ $state: "/error" },
];

const filterArgs = {
	scores: { $state: "/scores" },
	searchTerm: { $state: "/searchTerm" },
	minScore: { $state: "/minScore" },
};

/**
 * The entire karaoke viewer as a json-render spec. Every node references a
 * component from the catalog; dynamic values come from the state model via
 * `$state` / `$bindState`, and derived data via `$computed`.
 */
export const spec: Spec = {
	root: "page",
	elements: {
		page: {
			type: "Page",
			props: {},
			children: [
				"loading",
				"error",
				"header",
				"viewToggle",
				"statGrid",
				"toolbar",
				"songsTable",
				"artistsTable",
				"footer",
			],
		},

		loading: {
			type: "StatusMessage",
			props: { title: "読み込み中..." },
			visible: whenLoading,
		},

		error: {
			type: "StatusMessage",
			props: {
				title: { $state: "/error" },
				hint: "npm run scrape を実行してデータを取得してください",
			},
			visible: whenError,
		},

		header: {
			type: "Header",
			props: {
				title: "カラオケ採点履歴",
				subtitle: {
					$computed: "subtitleText",
					args: { scores: { $state: "/scores" } },
				},
			},
			visible: whenReady,
		},

		viewToggle: {
			type: "ViewToggle",
			props: { value: { $state: "/viewMode" } },
			on: {
				selectSongs: { action: "setViewMode", params: { mode: "songs" } },
				selectArtists: { action: "setViewMode", params: { mode: "artists" } },
			},
			visible: whenReady,
		},

		statGrid: {
			type: "StatGrid",
			props: {},
			children: ["statTotal", "statAvg", "statMax"],
			visible: whenReady,
		},
		statTotal: {
			type: "StatCard",
			props: {
				label: "総曲数",
				tone: "blue",
				value: {
					$computed: "statValue",
					args: { ...filterArgs, field: "total" },
				},
			},
		},
		statAvg: {
			type: "StatCard",
			props: {
				label: "平均点",
				tone: "purple",
				value: {
					$computed: "statValue",
					args: { ...filterArgs, field: "avg" },
				},
			},
		},
		statMax: {
			type: "StatCard",
			props: {
				label: "最高点",
				tone: "green",
				value: {
					$computed: "statValue",
					args: { ...filterArgs, field: "max" },
				},
			},
		},

		toolbar: {
			type: "Toolbar",
			props: {
				searchValue: { $bindState: "/searchTerm" },
				searchPlaceholder: "曲名または歌手名で検索",
				minScore: { $bindState: "/minScore" },
			},
			visible: whenReady,
		},

		songsTable: {
			type: "ScoreTable",
			props: {
				rows: {
					$computed: "visibleScores",
					args: {
						...filterArgs,
						sortKey: { $state: "/sortKey" },
						sortDirection: { $state: "/sortDirection" },
					},
				},
				sortKey: { $state: "/sortKey" },
				sortDirection: { $state: "/sortDirection" },
				emptyText: "検索条件に一致するデータがありません",
			},
			on: {
				sortSongName: { action: "sortScores", params: { key: "songName" } },
				sortArtist: { action: "sortScores", params: { key: "artist" } },
				sortScore: { action: "sortScores", params: { key: "score" } },
			},
			visible: [...whenReady, { $state: "/viewMode", eq: "songs" }],
		},

		artistsTable: {
			type: "ArtistTable",
			props: {
				rows: {
					$computed: "artistRows",
					args: {
						scores: { $state: "/scores" },
						sortKey: { $state: "/artistSortKey" },
						sortDirection: { $state: "/artistSortDirection" },
					},
				},
				sortKey: { $state: "/artistSortKey" },
				sortDirection: { $state: "/artistSortDirection" },
			},
			on: {
				sortArtist: { action: "sortArtists", params: { key: "artist" } },
				sortSongCount: { action: "sortArtists", params: { key: "songCount" } },
				sortAvgScore: { action: "sortArtists", params: { key: "avgScore" } },
				sortMaxScore: { action: "sortArtists", params: { key: "maxScore" } },
				sortMinScore: { action: "sortArtists", params: { key: "minScore" } },
			},
			visible: [...whenReady, { $state: "/viewMode", eq: "artists" }],
		},

		footer: {
			type: "Footer",
			props: {
				text: {
					$computed: "footerText",
					args: { ...filterArgs, viewMode: { $state: "/viewMode" } },
				},
			},
			visible: whenReady,
		},
	},
};
