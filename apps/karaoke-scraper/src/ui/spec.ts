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
	scoringType: { $state: "/scoringType" },
	period: { $state: "/period" },
	meta: { $state: "/meta" },
	category: { $state: "/category" },
	era: { $state: "/era" },
};

const inView = (mode: string): SingleCondition[] => [
	...whenReady,
	{ $state: "/viewMode", eq: mode },
];

/** Filter bar applies to the three list views (not to analysis). */
const whenFilterable: SingleCondition[] = [
	...whenReady,
	{ $state: "/viewMode", neq: "analysis" },
];

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
				"filterBar",
				"songsTable",
				"showMore",
				"repertoireTable",
				"artistsTable",
				"analysisPanel",
				"songDetailModal",
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
				selectRepertoire: {
					action: "setViewMode",
					params: { mode: "repertoire" },
				},
				selectArtists: { action: "setViewMode", params: { mode: "artists" } },
				selectAnalysis: {
					action: "setViewMode",
					params: { mode: "analysis" },
				},
			},
			visible: whenReady,
		},

		statGrid: {
			type: "StatGrid",
			props: {},
			children: ["statTotal", "statUnique", "statAvg", "statMax"],
			visible: whenReady,
		},
		statTotal: {
			type: "StatCard",
			props: {
				label: "総件数",
				tone: "blue",
				value: {
					$computed: "statValue",
					args: { ...filterArgs, field: "total" },
				},
			},
		},
		statUnique: {
			type: "StatCard",
			props: {
				label: "歌った曲数",
				tone: "amber",
				value: {
					$computed: "statValue",
					args: { ...filterArgs, field: "unique" },
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

		filterBar: {
			type: "FilterBar",
			props: {
				searchValue: { $bindState: "/searchTerm" },
				searchPlaceholder: "曲名・歌手名で検索（スペースで複数キーワード）",
				minScore: { $bindState: "/minScore" },
				scoringType: { $state: "/scoringType" },
				period: { $state: "/period" },
				typeOptions: {
					$computed: "typeOptions",
					args: { scores: { $state: "/scores" } },
				},
				resultCount: {
					$computed: "filteredCount",
					args: filterArgs,
				},
				totalCount: {
					$computed: "statValue",
					args: {
						scores: { $state: "/scores" },
						searchTerm: "",
						minScore: 0,
						scoringType: "all",
						period: "all",
						field: "total",
					},
				},
				categoryOptions: {
					$computed: "categoryOptions",
					args: {
						scores: { $state: "/scores" },
						meta: { $state: "/meta" },
					},
				},
				category: { $state: "/category" },
				era: { $state: "/era" },
			},
			visible: whenFilterable,
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
						limit: { $state: "/visibleCount" },
					},
				},
				sortKey: { $state: "/sortKey" },
				sortDirection: { $state: "/sortDirection" },
				emptyText: "検索条件に一致するデータがありません",
			},
			on: {
				sortDate: { action: "sortScores", params: { key: "date" } },
				sortSongName: { action: "sortScores", params: { key: "songName" } },
				sortArtist: { action: "sortScores", params: { key: "artist" } },
				sortType: { action: "sortScores", params: { key: "scoringType" } },
				sortScore: { action: "sortScores", params: { key: "score" } },
			},
			visible: inView("songs"),
		},

		showMore: {
			type: "ShowMore",
			props: {
				shown: {
					$computed: "shownCount",
					args: { ...filterArgs, limit: { $state: "/visibleCount" } },
				},
				total: {
					$computed: "filteredCount",
					args: filterArgs,
				},
			},
			visible: inView("songs"),
		},

		repertoireTable: {
			type: "RepertoireTable",
			props: {
				rows: {
					$computed: "repertoireRows",
					args: {
						...filterArgs,
						sortKey: { $state: "/repSortKey" },
						sortDirection: { $state: "/repSortDirection" },
					},
				},
				sortKey: { $state: "/repSortKey" },
				sortDirection: { $state: "/repSortDirection" },
				emptyText: "条件に一致する曲がありません",
			},
			on: {
				sortSongName: {
					action: "sortRepertoire",
					params: { key: "songName" },
				},
				sortArtist: { action: "sortRepertoire", params: { key: "artist" } },
				sortBest: { action: "sortRepertoire", params: { key: "bestScore" } },
				sortAvg: { action: "sortRepertoire", params: { key: "avgScore" } },
				sortAttempts: {
					action: "sortRepertoire",
					params: { key: "attempts" },
				},
				sortLast: { action: "sortRepertoire", params: { key: "lastDate" } },
			},
			visible: inView("repertoire"),
		},

		artistsTable: {
			type: "ArtistTable",
			props: {
				rows: {
					$computed: "artistRows",
					args: {
						...filterArgs,
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
			visible: inView("artists"),
		},

		analysisPanel: {
			type: "AnalysisPanel",
			props: {
				data: {
					$computed: "analysisData",
					args: { scores: { $state: "/scores" } },
				},
			},
			visible: inView("analysis"),
		},

		songDetailModal: {
			type: "SongDetailModal",
			props: {
				detail: {
					$computed: "songDetail",
					args: {
						scores: { $state: "/scores" },
						selectedKey: { $state: "/selectedSong" },
						meta: { $state: "/meta" },
					},
				},
			},
			visible: [{ $state: "/selectedSong" }],
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
