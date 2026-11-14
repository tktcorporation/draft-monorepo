import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, chromium } from "playwright";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// コマンドライン引数をチェックして、フルスクレイピングモードかどうかを判定
// --full フラグがある場合: 全ページをスクレイピング（既存データも含めて）
// --full フラグがない場合（デフォルト）: 既存データに達したらスクレイピングを停止
const fullScrape = process.argv.includes("--full");

if (!process.env.CLUB_DAM_ID || !process.env.CLUB_DAM_PASS) {
	console.error(
		"Error: CLUB_DAM_ID and CLUB_DAM_PASS environment variables are required",
	);
	process.exit(1);
}

const CLUB_DAM_ID: string = process.env.CLUB_DAM_ID;
const CLUB_DAM_PASS: string = process.env.CLUB_DAM_PASS;

// DAM★ともの履歴はスマホ版（/app/damtomo/SP/）でのみ提供されている
// （デスクトップ版のURLはスマホ版へリダイレクトされる。2026-11-15 実地確認）
const SP_BASE = "https://www.clubdam.com/app/damtomo/SP";
const LOGIN_URL = `${SP_BASE}/auth/member/Login.do`;
const MY_PAGE_URL = `${SP_BASE}/MyPage.do`;

interface KaraokeScore {
	songName: string;
	artist: string;
	score: number;
	date?: string;
	scoringType: string;
}

// 対応する採点タイプリスト
// file はマイページ内のリンク先ファイル名（一覧ページのエンドポイント）
// DAMでは採点形式ごとに履歴の保存場所が異なるため、存在する一覧は全て巡回する
const scoringTypes = [
	{ file: "ScoringAiList.do", name: "精密採点Ai" },
	{ file: "ScoringHeartsList.do", name: "精密採点Ai Heart" },
	{ file: "ScoringCollaboList.do", name: "精密採点 × ONE PIECE" },
	{ file: "ScoringDxgList.do", name: "精密採点DX-G" },
	{ file: "ScoringDxgDuetList.do", name: "精密採点DX-Gデュエット" },
	{ file: "ScoringMillionHistoryList.do", name: "精密採点DX ミリオン" },
	{ file: "MarkingDxList.do", name: "精密採点DX" },
	{ file: "MarkingTwoList.do", name: "精密採点Ⅱ" },
	{ file: "MarkingList.do", name: "精密採点(プラス)" },
	{ file: "SimpleList.do", name: "シンプル採点" },
	{ file: "UtaikirimasyoList.do", name: "完唱!歌いきりまショー!!" },
	{ file: "UtaikiriList.do", name: "完唱!" },
	{ file: "RankingList.do", name: "ランキングバトル ONLINE" },
	{ file: "TrainingList.do", name: "DAM ボイストレーニング" },
] as const;

// 1ページ分のHTMLからスコアブロックを抽出する（ブラウザ側で実行）
// スマホ版の一覧は table ではなく、1件ごとのブロック表示で、
// 各ブロックのテキストは「日付 時刻 / 曲名 / アーティスト名 / 点数：XX.XXX点 / 最終演奏キー：0」の形
function extractScoresFromPage(typeName: string) {
	const results: {
		songName: string;
		artist: string;
		score: number;
		date?: string;
		scoringType: string;
	}[] = [];

	const dateRe = /(\d{4})\/\s*(\d{1,2})\/\s*(\d{1,2})\s+(\d{1,2}):\s*(\d{2})/;
	const scoreRe = /点数：\s*([\d.]+)\s*点/;

	// 点数表記を含む最も小さい要素を1件分のブロックとみなす
	const candidates = Array.from(
		document.querySelectorAll("a, li, div, td"),
	).filter((el) => {
		const text = el.textContent ?? "";
		if (!scoreRe.test(text) || !dateRe.test(text)) return false;
		// 子要素にも同じパターンがある場合は、そちらがブロック本体
		return !Array.from(el.children).some((child) => {
			const childText = child.textContent ?? "";
			return scoreRe.test(childText) && dateRe.test(childText);
		});
	});

	for (const el of candidates) {
		try {
			const raw = el.textContent ?? "";
			const dateMatch = raw.match(dateRe);
			const scoreMatch = raw.match(scoreRe);
			if (!dateMatch || !scoreMatch) continue;

			const pad = (v: string) => v.padStart(2, "0");
			const date = `${dateMatch[1]}/${pad(dateMatch[2])}/${pad(dateMatch[3])} ${pad(dateMatch[4])}:${dateMatch[5]}`;
			const score = Number.parseFloat(scoreMatch[1]);
			if (!score) continue;

			// 日付・点数・最終演奏キーを除いた残りを行に分け、曲名とアーティスト名を取り出す
			const rest = raw
				.replace(dateRe, " ")
				.replace(scoreRe, " ")
				.replace(/最終演奏キー：\s*-?\d+/, " ");
			const lines = rest
				.split("\n")
				.map((line) => line.replace(/\s+/g, " ").trim())
				.filter((line) => line.length > 0);

			let songName = "";
			let artist = "";
			if (lines.length >= 2) {
				songName = lines[0];
				artist = lines[1];
			} else if (lines.length === 1) {
				// 1行に潰れている場合は、最後の語句をアーティスト名とみなす（ベストエフォート）
				const tokens = lines[0].split(" ");
				if (tokens.length >= 2) {
					artist = tokens[tokens.length - 1];
					songName = tokens.slice(0, -1).join(" ");
				} else {
					songName = lines[0];
				}
			}
			if (!songName) continue;

			results.push({
				songName,
				artist: artist || "Unknown",
				score,
				date,
				scoringType: typeName,
			});
		} catch (e) {
			console.error("Error parsing score block:", e);
		}
	}

	return results;
}

async function login(page: Page): Promise<void> {
	console.log("Navigating to DAM TOMO login page (SP)...");
	await page.goto(LOGIN_URL, { waitUntil: "networkidle", timeout: 60000 });

	console.log("Filling in login credentials...");
	await page.fill('input[name="id"]', CLUB_DAM_ID);
	await page.fill('input[name="password"]', CLUB_DAM_PASS);

	console.log("Submitting login form...");
	await Promise.all([
		page.waitForNavigation({ waitUntil: "networkidle", timeout: 60000 }),
		page.click('input[type="submit"]'),
	]);

	console.log("Login successful!");
}

// マイページ内のリンクから、各採点タイプの一覧ページURL（会員固有パラメータ付き）を集める
async function collectListUrls(page: Page): Promise<Map<string, string>> {
	await page.goto(MY_PAGE_URL, { waitUntil: "networkidle", timeout: 60000 });
	const hrefs = await page.evaluate(() =>
		Array.from(document.querySelectorAll("a[href]")).map((a) =>
			a.getAttribute("href"),
		),
	);
	const urls = new Map<string, string>();
	for (const href of hrefs) {
		if (!href) continue;
		for (const type of scoringTypes) {
			if (href.includes(type.file) && !urls.has(type.file)) {
				urls.set(type.file, new URL(href, page.url()).toString());
			}
		}
	}
	return urls;
}

// 一覧ページのURLに pageNo を付けて返す
function withPageNo(listUrl: string, pageNo: number): string {
	const url = new URL(listUrl);
	url.searchParams.set("pageNo", String(pageNo));
	return url.toString();
}

async function scrapeType(
	page: Page,
	listUrl: string,
	typeName: string,
	existingKeys: Set<string>,
	getUniqueKey: (score: KaraokeScore) => string,
): Promise<KaraokeScore[]> {
	const collected: KaraokeScore[] = [];
	const maxPages = 120; // 安全上限（精密採点Aiは40ページ程度）

	for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
		await page.goto(withPageNo(listUrl, pageNo), {
			waitUntil: "networkidle",
			timeout: 60000,
		});

		const bodyText = await page.evaluate(
			() => document.body?.textContent ?? "",
		);
		if (bodyText.includes("データはありません")) {
			console.log(`${typeName}: no more data (page ${pageNo})`);
			break;
		}

		const scores = await page.evaluate(extractScoresFromPage, typeName);
		console.log(`${typeName}: page ${pageNo} -> ${scores.length} scores`);
		if (scores.length === 0) break;

		// インクリメンタルモード: このページが全て既存データなら早期終了
		if (!fullScrape) {
			const newOnPage = scores.filter(
				(score) => !existingKeys.has(getUniqueKey(score)),
			);
			collected.push(...scores);
			if (newOnPage.length === 0) {
				console.log(
					`${typeName}: all scores on this page already exist. Stopping.`,
				);
				break;
			}
		} else {
			collected.push(...scores);
		}
	}

	return collected;
}

async function scrapeKaraokeScores(): Promise<KaraokeScore[]> {
	const browser = await chromium.launch({ headless: true });

	try {
		const context = await browser.newContext();
		const page = await context.newPage();

		await login(page);

		// インクリメンタルスクレイピングのために、既存のスコアデータを読み込む
		const outputPath = path.join(__dirname, "scores.json");
		let existingScores: KaraokeScore[] = [];

		// 重複判定のためのユニークキー生成関数
		// 例: "青と夏(生音)||Mrs. GREEN APPLE||2025/08/02 20:53||精密採点Ai"
		const getUniqueKey = (score: KaraokeScore) =>
			`${score.songName}||${score.artist}||${score.date}||${score.scoringType}`;

		try {
			const existingData = await fs.readFile(outputPath, "utf-8");
			existingScores = JSON.parse(existingData);
			console.log(`\nLoaded ${existingScores.length} existing scores`);
		} catch {
			console.log("\nNo existing scores found, will scrape all pages");
		}

		const existingKeys = new Set(existingScores.map(getUniqueKey));

		if (fullScrape) {
			console.log("Running in FULL mode - will scrape all pages\n");
		} else {
			console.log(
				"Running in INCREMENTAL mode - will stop when reaching existing data\n",
			);
		}

		const listUrls = await collectListUrls(page);
		const allScores: KaraokeScore[] = [];

		for (const type of scoringTypes) {
			console.log(`\n=== Checking ${type.name} ===`);
			const listUrl = listUrls.get(type.file);
			if (!listUrl) {
				console.log(`Link not found for ${type.name} on MyPage`);
				continue;
			}
			try {
				const scores = await scrapeType(
					page,
					listUrl,
					type.name,
					existingKeys,
					getUniqueKey,
				);
				console.log(`Total scores for ${type.name}: ${scores.length}`);
				allScores.push(...scores);
			} catch (error) {
				console.log(`Error processing ${type.name}:`, error);
			}
		}

		console.log(`\n=== Total scores found: ${allScores.length} ===`);

		if (allScores.length === 0) {
			console.log("\nNo scores found.");
			return [];
		}

		// 既存データと重複しないものだけを抽出
		const newScores = allScores.filter(
			(score) => !existingKeys.has(getUniqueKey(score)),
		);
		console.log(`Found ${newScores.length} new scores to add`);

		// 既存スコアと新規スコアを結合し、点数降順にソート
		const combinedScores = [...existingScores, ...newScores];
		combinedScores.sort((a, b) => b.score - a.score);

		// Save to JSON file
		await fs.writeFile(
			outputPath,
			JSON.stringify(combinedScores, null, 2),
			"utf-8",
		);
		console.log(
			`\nScores saved to ${outputPath} (total: ${combinedScores.length})`,
		);

		// Also save to public directory for web app
		const publicPath = path.join(__dirname, "public", "scores.json");
		await fs.writeFile(
			publicPath,
			JSON.stringify(combinedScores, null, 2),
			"utf-8",
		);
		console.log(`Scores also saved to ${publicPath}`);

		// Display top 10
		console.log("\n=== Top 10 scores ===");
		combinedScores.slice(0, 10).forEach((score, index) => {
			console.log(
				`${index + 1}. ${score.songName} - ${score.artist}: ${score.score} (${score.date})`,
			);
		});

		// Display statistics
		const avgScore =
			combinedScores.reduce((sum, s) => sum + s.score, 0) /
			combinedScores.length;
		console.log("\n=== Statistics ===");
		console.log(`Total songs: ${combinedScores.length}`);
		console.log(`Average score: ${avgScore.toFixed(2)}`);
		console.log(`Highest score: ${combinedScores[0].score}`);
		console.log(
			`Lowest score: ${combinedScores[combinedScores.length - 1].score}`,
		);

		return combinedScores;
	} finally {
		await browser.close();
	}
}

scrapeKaraokeScores()
	.then((scores) => {
		console.log(
			`\nScraping completed successfully! Total scores: ${scores.length}`,
		);
	})
	.catch((error) => {
		console.error("Failed to scrape karaoke scores:", error);
		process.exit(1);
	});
