import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

/**
 * A single karaoke score row (raw scraped data).
 */
export interface KaraokeScore {
	songName: string;
	artist: string;
	score: number;
	date?: string;
	scoringType: string;
}

/**
 * Per-song metadata produced by enrich-meta.ts: release year and genre from
 * external music databases, plus derived categories
 * （ボカロ / アニメ / 洋楽 / 邦楽）.
 */
export interface SongMeta {
	year?: number;
	genre?: string;
	categories: string[];
	source: string;
}

export type SongMetaMap = Record<string, SongMeta>;

/** A score row enriched with its display-only metadata label. */
export type ScoreRow = KaraokeScore & { metaText: string };

/**
 * Aggregated per-artist statistics.
 */
export interface ArtistStats {
	artist: string;
	songCount: number;
	avgScore: number;
	maxScore: number;
	minScore: number;
}

/**
 * Aggregated per-song statistics (the "repertoire" view): one row per
 * song + artist pair, built from all attempts of that song.
 */
export interface RepertoireRow {
	songName: string;
	artist: string;
	bestScore: number;
	avgScore: number;
	attempts: number;
	firstDate?: string;
	lastDate?: string;
	types: string[];
	/** Display label from song metadata, e.g. "2018年 ・ アニメ". */
	metaText: string;
}

/**
 * One month of singing activity for the analysis charts.
 */
export interface MonthlyPoint {
	month: string;
	count: number;
	avgScore: number;
}

/**
 * Aggregated statistics for one scoring type (精密採点Ai, DX-G, ...).
 */
export interface TypeStats {
	scoringType: string;
	count: number;
	avgScore: number;
	maxScore: number;
}

/**
 * Everything the analysis view renders, computed in one pass.
 */
export interface AnalysisData {
	monthly: MonthlyPoint[];
	distribution: { label: string; count: number }[];
	byType: TypeStats[];
}

/**
 * Full attempt history for one song, shown in the detail modal.
 */
export interface SongDetail {
	songName: string;
	artist: string;
	attempts: KaraokeScore[];
	bestScore: number;
	avgScore: number;
	count: number;
	types: string[];
	/** Display label from song metadata, e.g. "2018年 ・ アニメ ・ J-Pop". */
	metaText: string;
}

/**
 * The json-render catalog: the closed set of components the UI spec is allowed
 * to reference. The whole karaoke viewer is described as a JSON spec built from
 * these components (see ./spec.ts) and rendered by @json-render/react.
 */
export const catalog = defineCatalog(schema, {
	components: {
		Page: {
			description: "Top-level page shell with a centered content column.",
			slots: ["default"],
			props: z.object({}),
		},
		Header: {
			description: "Page header with an icon, a title and a subtitle line.",
			props: z.object({
				title: z.string(),
				subtitle: z.string(),
			}),
		},
		ViewToggle: {
			description:
				"Segmented control that switches between the history, repertoire, artists and analysis views.",
			props: z.object({
				value: z.string(),
			}),
		},
		StatGrid: {
			description: "Responsive grid that lays out summary stat cards.",
			slots: ["default"],
			props: z.object({}),
		},
		StatCard: {
			description:
				"A single summary metric with a label, value and accent icon.",
			props: z.object({
				label: z.string(),
				value: z.union([z.string(), z.number()]),
				tone: z.enum(["blue", "purple", "green", "amber"]),
			}),
		},
		FilterBar: {
			description:
				"Search box (multi-keyword), scoring-type chips, period preset and minimum-score filter. Search and minimum score are two-way bound to the state model; type and period are written via events.",
			props: z.object({
				searchValue: z.string(),
				searchPlaceholder: z.string(),
				minScore: z.number(),
				scoringType: z.string(),
				period: z.string(),
				typeOptions: z.array(z.any()),
				resultCount: z.number(),
				totalCount: z.number(),
				categoryOptions: z.array(z.any()),
				category: z.string(),
				era: z.string(),
			}),
		},
		ScoreTable: {
			description:
				"Sortable table of individual score attempts (date, song, artist, type, score). Rows are supplied pre-filtered and pre-sorted. Clicking a row opens that song's detail.",
			props: z.object({
				rows: z.array(z.any()),
				sortKey: z.string(),
				sortDirection: z.string(),
				emptyText: z.string(),
			}),
		},
		RepertoireTable: {
			description:
				"Sortable per-song aggregate table (best/average score, attempts, last sung date). Rows are supplied pre-aggregated and pre-sorted. Clicking a row opens that song's detail.",
			props: z.object({
				rows: z.array(z.any()),
				sortKey: z.string(),
				sortDirection: z.string(),
				emptyText: z.string(),
			}),
		},
		ArtistTable: {
			description:
				"Sortable table of per-artist aggregate statistics. Rows are supplied pre-sorted.",
			props: z.object({
				rows: z.array(z.any()),
				sortKey: z.string(),
				sortDirection: z.string(),
			}),
		},
		AnalysisPanel: {
			description:
				"Analysis view: monthly activity/average chart, score distribution and per-scoring-type statistics.",
			props: z.object({
				data: z.any(),
			}),
		},
		ShowMore: {
			description:
				"Button that reveals more rows of the history table. Hidden when everything is shown.",
			props: z.object({
				shown: z.number(),
				total: z.number(),
			}),
		},
		SongDetailModal: {
			description:
				"Modal showing every attempt of the selected song with best/average stats. Rendered only while a song is selected.",
			props: z.object({
				detail: z.any(),
			}),
		},
		StatusMessage: {
			description: "Centered status message used for loading and error states.",
			props: z.object({
				title: z.string(),
				hint: z.string().optional(),
			}),
		},
		Footer: {
			description: "Muted footer line showing the current result count.",
			props: z.object({
				text: z.string(),
			}),
		},
	},
	actions: {},
});

export type Catalog = typeof catalog;
