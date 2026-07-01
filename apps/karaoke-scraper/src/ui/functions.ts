import type { ComputedFunction } from "@json-render/core";
import type { ArtistStats, KaraokeScore } from "./catalog";

type Direction = "asc" | "desc";

function asScores(value: unknown): KaraokeScore[] {
	return Array.isArray(value) ? (value as KaraokeScore[]) : [];
}

function matches(score: KaraokeScore, term: string, minScore: number): boolean {
	const t = term.toLowerCase();
	const hit =
		score.songName.toLowerCase().includes(t) ||
		score.artist.toLowerCase().includes(t);
	return hit && score.score >= minScore;
}

function compare(a: unknown, b: unknown, direction: Direction): number {
	if (typeof a === "number" && typeof b === "number") {
		return direction === "asc" ? a - b : b - a;
	}
	const cmp = String(a)
		.toLowerCase()
		.localeCompare(String(b).toLowerCase(), "ja");
	return direction === "asc" ? cmp : -cmp;
}

/**
 * Filter (search + minimum score) and sort the raw song scores.
 * Used by the songs table via a `$computed` prop expression.
 */
const visibleScores: ComputedFunction = (args) => {
	const scores = asScores(args.scores);
	const term = String(args.searchTerm ?? "");
	const minScore = Number(args.minScore ?? 0);
	const sortKey = String(args.sortKey ?? "score") as keyof KaraokeScore;
	const direction = (args.sortDirection as Direction) ?? "desc";

	return scores
		.filter((s) => matches(s, term, minScore))
		.sort((a, b) => compare(a[sortKey], b[sortKey], direction));
};

/**
 * Compute a single headline statistic ("total" | "avg" | "max") over the
 * currently filtered song list.
 */
const statValue: ComputedFunction = (args) => {
	const scores = asScores(args.scores).filter((s) =>
		matches(s, String(args.searchTerm ?? ""), Number(args.minScore ?? 0)),
	);
	const field = String(args.field ?? "total");

	if (field === "total") return scores.length;
	if (scores.length === 0) return "0.0";
	if (field === "avg") {
		return (
			scores.reduce((sum, s) => sum + s.score, 0) / scores.length
		).toFixed(1);
	}
	return Math.max(...scores.map((s) => s.score)).toFixed(1);
};

/**
 * Aggregate all scores per artist, then sort by the requested key/direction.
 * Used by the artists table via a `$computed` prop expression.
 */
const artistRows: ComputedFunction = (args) => {
	const scores = asScores(args.scores);
	const sortKey = String(args.sortKey ?? "avgScore") as keyof ArtistStats;
	const direction = (args.sortDirection as Direction) ?? "desc";

	const byArtist = new Map<string, ArtistStats>();
	for (const score of scores) {
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

/** Result-count line shown in the footer. */
const footerText: ComputedFunction = (args) => {
	const scores = asScores(args.scores);
	if (String(args.viewMode) === "artists") {
		const artists = new Set(scores.map((s) => s.artist));
		return `${artists.size}人のアーティストを表示中`;
	}
	const count = scores.filter((s) =>
		matches(s, String(args.searchTerm ?? ""), Number(args.minScore ?? 0)),
	).length;
	return count > 0 ? `${count}件の結果を表示中` : "";
};

/** `全{n}曲の採点データ` subtitle text. */
const subtitleText: ComputedFunction = (args) => {
	return `全${asScores(args.scores).length}曲の採点データ`;
};

/**
 * Named functions available to `$computed` prop expressions in the spec.
 */
export const functions = {
	visibleScores,
	statValue,
	artistRows,
	footerText,
	subtitleText,
};
