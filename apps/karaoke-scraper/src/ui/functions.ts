import type { ComputedFunction } from "@json-render/core";
import type {
	AnalysisData,
	ArtistStats,
	KaraokeScore,
	RepertoireRow,
	SongDetail,
	SongMetaMap,
	TypeStats,
} from "./catalog";

type Direction = "asc" | "desc";

interface FilterSet {
	searchTerm: string;
	minScore: number;
	scoringType: string;
	period: string;
	meta: SongMetaMap;
	category: string;
	era: string;
}

function asScores(value: unknown): KaraokeScore[] {
	return Array.isArray(value) ? (value as KaraokeScore[]) : [];
}

function asMetaMap(value: unknown): SongMetaMap {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as SongMetaMap;
	}
	return {};
}

function readFilters(args: Record<string, unknown>): FilterSet {
	return {
		searchTerm: String(args.searchTerm ?? ""),
		minScore: Number(args.minScore ?? 0),
		scoringType: String(args.scoringType ?? "all"),
		period: String(args.period ?? "all"),
		meta: asMetaMap(args.meta),
		category: String(args.category ?? "all"),
		era: String(args.era ?? "all"),
	};
}

/** Display label from a song's metadata, e.g. "2018年 ・ アニメ ・ J-Pop". */
function metaTextForKey(meta: SongMetaMap, key: string): string {
	const entry = meta[key];
	if (!entry) return "";
	const parts: string[] = [];
	if (entry.year) parts.push(`${entry.year}年`);
	parts.push(...entry.categories);
	if (entry.genre && !entry.categories.includes(entry.genre)) {
		parts.push(entry.genre);
	}
	return parts.join(" ・ ");
}

function metaText(meta: SongMetaMap, score: KaraokeScore): string {
	return metaTextForKey(meta, `${score.songName}||${score.artist}`);
}

const ERA_RANGES: Record<string, [number, number]> = {
	"2020s": [2020, 2029],
	"2010s": [2010, 2019],
	"2000s": [2000, 2009],
	"1990s": [1990, 1999],
	older: [0, 1989],
};

/** Category （区分） and release-era （年代） filters, driven by song metadata. */
function matchesMeta(score: KaraokeScore, filters: FilterSet): boolean {
	const entry = filters.meta[`${score.songName}||${score.artist}`];
	if (filters.category !== "all") {
		if (!entry || !entry.categories.includes(filters.category)) return false;
	}
	if (filters.era !== "all") {
		const range = ERA_RANGES[filters.era];
		if (!range || !entry?.year) return false;
		if (entry.year < range[0] || entry.year > range[1]) return false;
	}
	return true;
}

/** Normalize for search: case-fold and unify full/half-width characters. */
function normalize(text: string): string {
	return text.normalize("NFKC").toLowerCase();
}

/**
 * Multi-keyword AND search over song name + artist. Each whitespace-separated
 * keyword must appear somewhere in "songName artist" (after normalization, so
 * full-width input and mixed case work).
 */
function matchesSearch(score: KaraokeScore, searchTerm: string): boolean {
	const keywords = normalize(searchTerm).split(/\s+/).filter(Boolean);
	if (keywords.length === 0) return true;
	const haystack = normalize(`${score.songName} ${score.artist}`);
	return keywords.every((keyword) => haystack.includes(keyword));
}

/** Parse a "YYYY/MM/DD HH:MM" date string, or return null. */
function parseDate(value?: string): Date | null {
	if (!value) return null;
	const match = value.match(
		/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/,
	);
	if (!match) return null;
	return new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
		Number(match[4] ?? 0),
		Number(match[5] ?? 0),
	);
}

const PERIOD_MONTHS: Record<string, number> = {
	"1m": 1,
	"3m": 3,
	"6m": 6,
	"1y": 12,
};

function matchesPeriod(score: KaraokeScore, period: string): boolean {
	const months = PERIOD_MONTHS[period];
	if (!months) return true;
	const date = parseDate(score.date);
	if (!date) return false;
	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - months);
	return date >= cutoff;
}

function matchesType(score: KaraokeScore, scoringType: string): boolean {
	return scoringType === "all" || score.scoringType === scoringType;
}

/** Apply the shared filters (search, type, period) at the attempt level. */
function filterAttempts(
	scores: KaraokeScore[],
	filters: FilterSet,
): KaraokeScore[] {
	return scores.filter(
		(s) =>
			matchesSearch(s, filters.searchTerm) &&
			matchesType(s, filters.scoringType) &&
			matchesPeriod(s, filters.period) &&
			matchesMeta(s, filters),
	);
}

function compare(a: unknown, b: unknown, direction: Direction): number {
	if (typeof a === "number" && typeof b === "number") {
		return direction === "asc" ? a - b : b - a;
	}
	const cmp = String(a ?? "")
		.toLowerCase()
		.localeCompare(String(b ?? "").toLowerCase(), "ja");
	return direction === "asc" ? cmp : -cmp;
}

/**
 * Filter (search + type + period + minimum score) and sort the raw attempts,
 * then keep only the first `limit` rows for display.
 */
const visibleScores: ComputedFunction = (args) => {
	const filters = readFilters(args);
	const sortKey = String(args.sortKey ?? "score") as keyof KaraokeScore;
	const direction = (args.sortDirection as Direction) ?? "desc";
	const limit = Number(args.limit ?? 100);

	return filterAttempts(asScores(args.scores), filters)
		.filter((s) => s.score >= filters.minScore)
		.sort((a, b) => compare(a[sortKey], b[sortKey], direction))
		.slice(0, limit)
		.map((s) => ({ ...s, metaText: metaText(filters.meta, s) }));
};

/** Number of attempts surviving the full filter set (before display limit). */
const filteredCount: ComputedFunction = (args) => {
	const filters = readFilters(args);
	return filterAttempts(asScores(args.scores), filters).filter(
		(s) => s.score >= filters.minScore,
	).length;
};

/** How many rows the history table actually shows (filtered count capped by the display limit). */
const shownCount: ComputedFunction = (args) => {
	const total = Number(filteredCount(args));
	return Math.min(total, Number(args.limit ?? 100));
};

/**
 * Compute a headline statistic over the filtered attempts:
 * "total" (attempt count) | "unique" (distinct songs) | "avg" | "max".
 */
const statValue: ComputedFunction = (args) => {
	const filters = readFilters(args);
	const scores = filterAttempts(asScores(args.scores), filters).filter(
		(s) => s.score >= filters.minScore,
	);
	const field = String(args.field ?? "total");

	if (field === "total") return scores.length;
	if (field === "unique") {
		return new Set(scores.map((s) => `${s.songName}||${s.artist}`)).size;
	}
	if (scores.length === 0) return "0.0";
	if (field === "avg") {
		return (
			scores.reduce((sum, s) => sum + s.score, 0) / scores.length
		).toFixed(1);
	}
	return Math.max(...scores.map((s) => s.score)).toFixed(3);
};

/** Distinct scoring types present in the data, with attempt counts. */
const typeOptions: ComputedFunction = (args) => {
	const counts = new Map<string, number>();
	for (const score of asScores(args.scores)) {
		counts.set(score.scoringType, (counts.get(score.scoringType) ?? 0) + 1);
	}
	return Array.from(counts.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
};

/**
 * Aggregate attempts per song (song + artist). Search/type/period filter the
 * attempts first; the minimum-score filter applies to each song's best score,
 * so "90点以上の十八番" style browsing works.
 */
const repertoireRows: ComputedFunction = (args) => {
	const filters = readFilters(args);
	const sortKey = String(args.sortKey ?? "bestScore") as keyof RepertoireRow;
	const direction = (args.sortDirection as Direction) ?? "desc";

	const bySong = new Map<string, RepertoireRow & { sum: number }>();
	for (const score of filterAttempts(asScores(args.scores), filters)) {
		const key = `${score.songName}||${score.artist}`;
		const existing = bySong.get(key);
		if (existing) {
			existing.attempts++;
			existing.sum += score.score;
			existing.bestScore = Math.max(existing.bestScore, score.score);
			if (score.date) {
				if (!existing.firstDate || score.date < existing.firstDate) {
					existing.firstDate = score.date;
				}
				if (!existing.lastDate || score.date > existing.lastDate) {
					existing.lastDate = score.date;
				}
			}
			if (!existing.types.includes(score.scoringType)) {
				existing.types.push(score.scoringType);
			}
		} else {
			bySong.set(key, {
				songName: score.songName,
				artist: score.artist,
				bestScore: score.score,
				avgScore: score.score,
				attempts: 1,
				firstDate: score.date,
				lastDate: score.date,
				types: [score.scoringType],
				metaText: "",
				sum: score.score,
			});
		}
	}

	return Array.from(bySong.values())
		.map(({ sum, ...row }) => ({
			...row,
			avgScore: sum / row.attempts,
			metaText: metaTextForKey(filters.meta, `${row.songName}||${row.artist}`),
		}))
		.filter((row) => row.bestScore >= filters.minScore)
		.sort((a, b) => compare(a[sortKey], b[sortKey], direction));
};

/**
 * Aggregate attempts per artist (respecting search/type/period), then sort.
 */
const artistRows: ComputedFunction = (args) => {
	const filters = readFilters(args);
	const sortKey = String(args.sortKey ?? "avgScore") as keyof ArtistStats;
	const direction = (args.sortDirection as Direction) ?? "desc";

	const byArtist = new Map<string, ArtistStats>();
	for (const score of filterAttempts(asScores(args.scores), filters)) {
		const existing = byArtist.get(score.artist);
		if (existing) {
			existing.songCount++;
			existing.avgScore += score.score;
			existing.maxScore = Math.max(existing.maxScore, score.score);
			existing.minScore = Math.min(existing.minScore, score.score);
		} else {
			byArtist.set(score.artist, {
				artist: score.artist,
				songCount: 1,
				avgScore: score.score,
				maxScore: score.score,
				minScore: score.score,
			});
		}
	}

	return Array.from(byArtist.values())
		.map((stat) => ({ ...stat, avgScore: stat.avgScore / stat.songCount }))
		.sort((a, b) => compare(a[sortKey], b[sortKey], direction));
};

/** Monthly activity, score distribution and per-type stats in one pass. */
const analysisData: ComputedFunction = (args): AnalysisData => {
	const scores = asScores(args.scores);

	const monthMap = new Map<string, { count: number; sum: number }>();
	for (const score of scores) {
		const date = parseDate(score.date);
		if (!date) continue;
		const month = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
		const entry = monthMap.get(month) ?? { count: 0, sum: 0 };
		entry.count++;
		entry.sum += score.score;
		monthMap.set(month, entry);
	}
	const monthly = Array.from(monthMap.entries())
		.map(([month, { count, sum }]) => ({
			month,
			count,
			avgScore: sum / count,
		}))
		.sort((a, b) => a.month.localeCompare(b.month));

	const buckets = [
		{ label: "〜70", min: 0 },
		{ label: "70〜75", min: 70 },
		{ label: "75〜80", min: 75 },
		{ label: "80〜85", min: 80 },
		{ label: "85〜90", min: 85 },
		{ label: "90〜95", min: 90 },
		{ label: "95〜", min: 95 },
	];
	const distribution = buckets.map((bucket, i) => {
		const next = buckets[i + 1]?.min ?? Number.POSITIVE_INFINITY;
		return {
			label: bucket.label,
			count: scores.filter((s) => s.score >= bucket.min && s.score < next)
				.length,
		};
	});

	const typeMap = new Map<string, TypeStats & { sum: number }>();
	for (const score of scores) {
		const entry = typeMap.get(score.scoringType) ?? {
			scoringType: score.scoringType,
			count: 0,
			avgScore: 0,
			maxScore: 0,
			sum: 0,
		};
		entry.count++;
		entry.sum += score.score;
		entry.maxScore = Math.max(entry.maxScore, score.score);
		typeMap.set(score.scoringType, entry);
	}
	const byType = Array.from(typeMap.values())
		.map(({ sum, ...row }) => ({ ...row, avgScore: sum / row.count }))
		.sort((a, b) => b.count - a.count);

	return { monthly, distribution, byType };
};

/**
 * Detail for the song selected in the state model (key: "songName||artist").
 * Returns null when nothing is selected or the song is unknown.
 */
const songDetail: ComputedFunction = (args): SongDetail | null => {
	const key = String(args.selectedKey ?? "");
	if (!key) return null;
	const [songName, artist] = key.split("||");
	const attempts = asScores(args.scores)
		.filter((s) => s.songName === songName && s.artist === artist)
		.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
	if (attempts.length === 0) return null;

	return {
		songName,
		artist,
		attempts,
		bestScore: Math.max(...attempts.map((s) => s.score)),
		avgScore: attempts.reduce((sum, s) => sum + s.score, 0) / attempts.length,
		count: attempts.length,
		types: Array.from(new Set(attempts.map((s) => s.scoringType))),
		metaText: metaTextForKey(asMetaMap(args.meta), key),
	};
};

/** Result-count line shown in the footer, per view. */
const footerText: ComputedFunction = (args) => {
	const scores = asScores(args.scores);
	const filters = readFilters(args);
	const viewMode = String(args.viewMode);

	if (viewMode === "artists") {
		const artists = new Set(
			filterAttempts(scores, filters).map((s) => s.artist),
		);
		return `${artists.size}人のアーティストを表示中`;
	}
	if (viewMode === "analysis") {
		return `全${scores.length}件の採点データから集計`;
	}
	const count = filterAttempts(scores, filters).filter(
		(s) => s.score >= (viewMode === "repertoire" ? 0 : filters.minScore),
	).length;
	return count > 0 ? `${count}件の結果を表示中` : "";
};

/** `全{n}件の採点データ・{m}曲` subtitle text. */
const subtitleText: ComputedFunction = (args) => {
	const scores = asScores(args.scores);
	const songs = new Set(scores.map((s) => `${s.songName}||${s.artist}`)).size;
	return `全${scores.length}件の採点データ・${songs}曲`;
};

const CATEGORY_ORDER = ["ボカロ", "アニメ", "洋楽", "邦楽"];

/** Attempt counts per metadata category, for the filter chips. */
const categoryOptions: ComputedFunction = (args) => {
	const meta = asMetaMap(args.meta);
	const counts = new Map<string, number>();
	for (const score of asScores(args.scores)) {
		const entry = meta[`${score.songName}||${score.artist}`];
		for (const category of entry?.categories ?? []) {
			counts.set(category, (counts.get(category) ?? 0) + 1);
		}
	}
	return CATEGORY_ORDER.filter((name) => counts.has(name)).map((name) => ({
		name,
		count: counts.get(name) ?? 0,
	}));
};

/**
 * Named functions available to `$computed` prop expressions in the spec.
 */
export const functions = {
	visibleScores,
	filteredCount,
	shownCount,
	statValue,
	typeOptions,
	categoryOptions,
	repertoireRows,
	artistRows,
	analysisData,
	songDetail,
	footerText,
	subtitleText,
};
