import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 曲メタデータ付与スクリプト
 *
 * scores.json の各曲（曲名+歌手名）について、外部の音楽データベースから
 * 発表年・ジャンルを引き、区分（ボカロ / アニメ / 洋楽 / 邦楽）を判定して
 * song-meta.json に保存する。ビューアはこのファイルを読み込んで
 * 年代・区分での絞り込みに使う。
 *
 * 参照順:
 *   1. iTunes Search API（発表年・ジャンル）。ライブ盤/ベスト盤を避け、
 *      同タイトルでは最古の正規リリースを優先する
 *   2. VocaDB（ボカロ曲の発表年・確定判定）
 *   3. MusicBrainz（残りの発表年フォールバック。1リクエスト/秒を厳守）
 *
 * 既に発表年が入っている曲はキャッシュとして再取得しない。
 * 判定を手直ししたい場合は song-meta-overrides.json に書くと最後に上書きされる。
 *
 * 使い方: npm run enrich
 */

interface KaraokeScore {
	songName: string;
	artist: string;
	score: number;
	date?: string;
	scoringType: string;
}

interface SongMeta {
	year?: number;
	genre?: string;
	categories: string[];
	source: string;
}

type SongMetaMap = Record<string, SongMeta>;

const USER_AGENT =
	"draft-karaoke-meta/1.0 (https://github.com/tktcorporation/draft-monorepo)";

// ボーカロイド系の歌声合成キャラクター名（アーティスト名・曲名に含まれればボカロ確定）
const VOCALOID_NAMES = [
	"初音ミク",
	"鏡音リン",
	"鏡音レン",
	"巡音ルカ",
	"KAITO",
	"MEIKO",
	"GUMI",
	"IA",
	"可不",
	"音街ウナ",
	"結月ゆかり",
	"神威がくぽ",
	"猫村いろは",
	"v flower",
	"重音テト",
	"ずんだもん",
	"小春六花",
	"夏色花梨",
	"花隈千冬",
];

function normalize(text: string): string {
	return text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/λ/g, "a")
		.replace(/\(.*?\)/g, "")
		.replace(/\[.*?\]/g, "")
		.replace(/[\s\-_~・/\\!！?？:：;；'"”’「」『』]+/g, "");
}

/** DAM表記の装飾（(生音)、[ルビ]、(〜Ver.) など）を落とした検索用タイトル */
function searchTitle(title: string): string {
	return title
		.replace(/（生音）|\(生音\)/g, "")
		.replace(/\[.*?\]/g, "")
		.replace(/（.*?）/g, "")
		.replace(/\(.*?\)/g, "")
		.trim();
}

/** feat. や × の前までを主アーティストとして取り出す */
function primaryArtist(artist: string): string {
	return artist
		.split(/feat\.|×|、|&|\[/)[0]
		.replace(/（.*?）/g, "")
		.trim();
}

function hasVocaloidMarker(songName: string, artist: string): boolean {
	const haystack = `${songName} ${artist}`;
	return VOCALOID_NAMES.some((name) => haystack.includes(name));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------- iTunes

interface ItunesResult {
	trackName?: string;
	artistName?: string;
	collectionName?: string;
	releaseDate?: string;
	primaryGenreName?: string;
}

interface ItunesResponse {
	results?: ItunesResult[];
}

function itunesCandidateScore(
	result: ItunesResult,
	title: string,
	artist: string,
): number {
	const nt = normalize(title);
	const na = normalize(artist);
	const rt = normalize(result.trackName ?? "");
	const ra = normalize(result.artistName ?? "");
	let score = 0;
	if (rt === nt) score += 3;
	else if (rt.includes(nt) || nt.includes(rt)) score += 2;
	if (ra === na) score += 3;
	else if (ra.includes(na) || na.includes(ra)) score += 2;
	// ライブ盤・ベスト盤は発表年がズレるので避ける
	const blob = `${result.trackName ?? ""} ${result.collectionName ?? ""}`;
	if (/live|ライブ/i.test(blob)) score -= 3;
	if (/best|ベスト|greatest/i.test(blob)) score -= 2;
	return score;
}

async function searchItunes(
	title: string,
	artist: string,
	country: string,
): Promise<{ year: number; genre?: string } | null> {
	const queries = [
		`${title} ${artist}`,
		`${title} ${primaryArtist(artist)}`,
		title,
	];
	for (const query of queries) {
		const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${country}&media=music&entity=song&limit=10`;
		const data = await fetchJson<ItunesResponse>(url);
		const results = data?.results ?? [];
		if (results.length === 0) continue;

		let best: ItunesResult | null = null;
		let bestScore = 0;
		for (const result of results) {
			const score = itunesCandidateScore(result, title, artist);
			if (score > bestScore) {
				bestScore = score;
				best = result;
			}
		}
		if (!best || bestScore < 4 || !best.releaseDate) continue;

		// ベストマッチと同点で、かつ歌手も一致する候補の中では最古のリリースを
		// 発表年とする（別アーティストの同名曲を拾わないため歌手一致を必須にする）
		const na = normalize(artist);
		const year = Math.min(
			...results
				.filter((r) => {
					if (itunesCandidateScore(r, title, artist) !== bestScore) {
						return false;
					}
					const ra = normalize(r.artistName ?? "");
					return ra === na || ra.includes(na) || na.includes(ra);
				})
				.map((r) => Number(r.releaseDate?.slice(0, 4))),
		);
		return { year, genre: best.primaryGenreName };
	}
	return null;
}

// ---------------------------------------------------------------- VocaDB

interface VocaDbEntry {
	name?: string;
	publishDate?: string;
	songType?: string;
}

interface VocaDbResponse {
	items?: VocaDbEntry[];
}

async function searchVocadb(title: string): Promise<{ year: number } | null> {
	const url = `https://vocadb.net/api/songs?query=${encodeURIComponent(title)}&fields=Artists&lang=Japanese&maxResults=10`;
	const data = await fetchJson<VocaDbResponse>(url);
	const nt = normalize(title);
	// 同名のカバー曲が多数あるため、タイトルが完全一致するエントリの中から
	// Original を優先し、最も古い公開年を採用する
	const exact = (data?.items ?? []).filter(
		(entry) => entry.publishDate && normalize(entry.name ?? "") === nt,
	);
	const originals = exact.filter((entry) => entry.songType === "Original");
	const pool = originals.length > 0 ? originals : exact;
	if (pool.length === 0) return null;
	const year = Math.min(
		...pool.map((entry) => Number(entry.publishDate?.slice(0, 4))),
	);
	return { year };
}

// ---------------------------------------------------------------- MusicBrainz

interface MbRecording {
	title?: string;
	score?: number;
	"first-release-date"?: string;
	tags?: { name: string }[];
}

interface MbResponse {
	recordings?: MbRecording[];
}

async function searchMusicBrainz(
	title: string,
	artist: string,
): Promise<{ year: number; anime: boolean } | null> {
	const query = `recording:"${title}" AND artist:"${primaryArtist(artist)}"`;
	const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=3`;
	for (let attempt = 0; attempt < 2; attempt++) {
		const data = await fetchJson<MbResponse>(url);
		if (data) {
			const nt = normalize(title);
			for (const rec of data.recordings ?? []) {
				if ((rec.score ?? 0) < 85) continue;
				if (normalize(rec.title ?? "") !== nt) continue;
				const date = rec["first-release-date"];
				if (!date) continue;
				return {
					year: Number(date.slice(0, 4)),
					anime: (rec.tags ?? []).some((t) => t.name === "anime"),
				};
			}
			return null;
		}
		await sleep(3000); // 503 の場合は間を空けて1回だけ再試行
	}
	return null;
}

// ---------------------------------------------------------------- 区分判定

const JAPANESE_GENRES = new Set([
	"J-Pop",
	"ロック",
	"アニメ",
	"歌謡曲",
	"演歌",
	"ポップ",
]);

function deriveCategories(params: {
	songName: string;
	artist: string;
	genre?: string;
	vocadbHit: boolean;
	mbAnime: boolean;
}): string[] {
	const categories = new Set<string>();
	// ボカロは歌声合成キャラクター名が含まれる場合のみ確定とする
	// （VocaDB には歌い手カバーやアニメ曲も載るため、ヒットだけでは判定しない）
	if (hasVocaloidMarker(params.songName, params.artist)) {
		categories.add("ボカロ");
	}
	if (params.genre === "アニメ" || params.mbAnime) {
		categories.add("アニメ");
	}
	// 洋楽は「歌手名が英字のみ」かつ「ジャンルが日本のジャンル名でない」
	// という積極的な証拠がある場合のみ。それ以外は邦楽に倒す
	const artistAscii = /^[\x20-\x7E\s.&'’-]+$/.test(
		primaryArtist(params.artist),
	);
	if (
		artistAscii &&
		params.genre &&
		!JAPANESE_GENRES.has(params.genre)
	) {
		categories.add("洋楽");
	} else {
		categories.add("邦楽");
	}
	return Array.from(categories);
}

// ---------------------------------------------------------------- 本体

async function main(): Promise<void> {
	const scoresPath = path.join(__dirname, "scores.json");
	const metaPath = path.join(__dirname, "song-meta.json");
	const publicMetaPath = path.join(__dirname, "public", "song-meta.json");
	const overridesPath = path.join(__dirname, "song-meta-overrides.json");

	const scores: KaraokeScore[] = JSON.parse(
		await fs.readFile(scoresPath, "utf-8"),
	);
	const unique = new Map<string, { songName: string; artist: string }>();
	for (const s of scores) {
		unique.set(`${s.songName}||${s.artist}`, {
			songName: s.songName,
			artist: s.artist,
		});
	}
	console.log(`Unique songs: ${unique.size}`);

	let meta: SongMetaMap = {};
	try {
		meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
		console.log(`Loaded cached meta for ${Object.keys(meta).length} songs`);
	} catch {
		console.log("No existing song-meta.json, starting fresh");
	}

	let overrides: SongMetaMap = {};
	try {
		overrides = JSON.parse(await fs.readFile(overridesPath, "utf-8"));
	} catch {
		// overrides は任意
	}

	let processed = 0;
	for (const [key, song] of unique) {
		const cached = meta[key];
		if (cached?.year) continue; // 発表年まで取れている曲はキャッシュを使う

		processed++;
		const title = searchTitle(song.songName);
		const sources: string[] = [];
		let year: number | undefined;
		let genre: string | undefined;
		let vocadbHit = false;
		let mbAnime = false;

		const itunes =
			(await searchItunes(title, song.artist, "JP")) ??
			(/^[!-~\s]+$/.test(song.artist)
				? await searchItunes(title, song.artist, "US")
				: null);
		if (itunes) {
			year = itunes.year;
			genre = itunes.genre;
			sources.push("itunes");
		}

		if (!year || hasVocaloidMarker(song.songName, song.artist)) {
			const vocadb = await searchVocadb(title);
			if (vocadb) {
				vocadbHit = true;
				sources.push("vocadb");
				if (!year) year = vocadb.year;
			}
			await sleep(200);
		}

		if (!year) {
			await sleep(1100); // MusicBrainz のレート制限（1req/sec）
			const mb = await searchMusicBrainz(title, song.artist);
			if (mb) {
				year = mb.year;
				mbAnime = mb.anime;
				sources.push("musicbrainz");
			}
		}

		meta[key] = {
			...(year ? { year } : {}),
			...(genre ? { genre } : {}),
			categories: deriveCategories({
				songName: song.songName,
				artist: song.artist,
				genre,
				vocadbHit,
				mbAnime,
			}),
			source: sources.length > 0 ? sources.join("+") : "none",
		};

		if (processed % 25 === 0) {
			console.log(`... processed ${processed} songs`);
			await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
		}
	}

	// 手動上書きを最後に適用
	for (const [key, override] of Object.entries(overrides)) {
		if (!meta[key]) continue;
		meta[key] = {
			...meta[key],
			...override,
			source: `${meta[key].source}+override`,
		};
	}

	const ordered: SongMetaMap = {};
	for (const key of Array.from(unique.keys()).sort()) {
		if (meta[key]) ordered[key] = meta[key];
	}
	const out = `${JSON.stringify(ordered, null, 2)}\n`;
	await fs.writeFile(metaPath, out, "utf-8");
	await fs.writeFile(publicMetaPath, out, "utf-8");

	const withYear = Object.values(ordered).filter((m) => m.year).length;
	const byCategory = new Map<string, number>();
	for (const m of Object.values(ordered)) {
		for (const c of m.categories) {
			byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
		}
	}
	console.log(
		`\nSaved ${Object.keys(ordered).length} entries to song-meta.json`,
	);
	console.log(
		`Year coverage: ${withYear}/${Object.keys(ordered).length} (${Math.round((withYear / Object.keys(ordered).length) * 100)}%)`,
	);
	console.log(
		`Categories: ${Array.from(byCategory.entries())
			.map(([k, v]) => `${k} ${v}`)
			.join(" / ")}`,
	);
}

main().catch((error) => {
	console.error("Failed to enrich metadata:", error);
	process.exit(1);
});
