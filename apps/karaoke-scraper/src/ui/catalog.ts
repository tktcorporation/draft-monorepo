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
				"Segmented control that switches between the songs and artists views.",
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
				tone: z.enum(["blue", "purple", "green"]),
			}),
		},
		Toolbar: {
			description:
				"Search box and minimum-score filter. Two-way bound to the state model.",
			props: z.object({
				searchValue: z.string(),
				searchPlaceholder: z.string(),
				minScore: z.number(),
			}),
		},
		ScoreTable: {
			description:
				"Sortable table of individual song scores. Rows are supplied pre-filtered and pre-sorted.",
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
