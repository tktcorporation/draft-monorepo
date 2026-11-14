import {
	defineRegistry,
	useBoundProp,
	useStateStore,
} from "@json-render/react";
import {
	ArrowUpDown,
	Award,
	BarChart3,
	CalendarDays,
	ChevronDown,
	Hash,
	Layers,
	ListMusic,
	Music,
	Search,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { catalog } from "./catalog";
import type {
	AnalysisData,
	ArtistStats,
	KaraokeScore,
	RepertoireRow,
	ScoreRow,
	SongDetail,
} from "./catalog";

function scoreBadgeClass(score: number): string {
	if (score >= 90) return "bg-green-50 text-green-700";
	if (score >= 85) return "bg-blue-50 text-blue-700";
	if (score >= 80) return "bg-purple-50 text-purple-700";
	if (score >= 75) return "bg-yellow-50 text-yellow-700";
	return "bg-gray-50 text-gray-700";
}

function ScoreBadge({ score }: { score: number }) {
	return (
		<span
			className={`inline-flex items-center justify-center min-w-[76px] px-3 py-1 rounded-md text-sm font-semibold tabular-nums ${scoreBadgeClass(
				score,
			)}`}
		>
			{score.toFixed(3)}
		</span>
	);
}

const typeChipClasses: Record<string, string> = {
	精密採点Ai: "bg-violet-50 text-violet-700",
	"精密採点Ai Heart": "bg-pink-50 text-pink-700",
	"精密採点DX-G": "bg-sky-50 text-sky-700",
	"精密採点DX-Gデュエット": "bg-cyan-50 text-cyan-700",
	"精密採点 × ONE PIECE": "bg-amber-50 text-amber-700",
};

function TypeChip({ scoringType }: { scoringType: string }) {
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
				typeChipClasses[scoringType] ?? "bg-gray-100 text-gray-600"
			}`}
		>
			{scoringType}
		</span>
	);
}

/** "2026/11/07 15:07" → { day: "2026/11/07", time: "15:07" } */
function splitDate(date?: string): { day: string; time: string } {
	if (!date) return { day: "—", time: "" };
	const [day, time] = date.split(" ");
	return { day, time: time ?? "" };
}

function songKey(score: { songName: string; artist: string }): string {
	return `${score.songName}||${score.artist}`;
}

interface SortableHeaderProps {
	label: string;
	active: boolean;
	direction: string;
	align?: "left" | "right";
	onSort: () => void;
}

function SortableHeader({
	label,
	active,
	direction,
	align = "left",
	onSort,
}: SortableHeaderProps) {
	return (
		<th
			className="px-4 md:px-6 py-4 font-medium text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none group"
			onClick={onSort}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSort();
				}
			}}
		>
			<div
				className={`flex items-center gap-2 ${
					align === "right" ? "justify-end" : ""
				}`}
			>
				{label}
				<ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
				{active && (
					<span className="text-xs">{direction === "asc" ? "↑" : "↓"}</span>
				)}
			</div>
		</th>
	);
}

const toneStyles: Record<string, { wrap: string; Icon: typeof Music }> = {
	blue: { wrap: "bg-blue-50 text-blue-600", Icon: Music },
	purple: { wrap: "bg-purple-50 text-purple-600", Icon: TrendingUp },
	green: { wrap: "bg-green-50 text-green-600", Icon: Award },
	amber: { wrap: "bg-amber-50 text-amber-600", Icon: Layers },
};

function Panel({
	children,
	padded,
}: { children: ReactNode; padded?: boolean }) {
	return (
		<div className="rounded-xl border bg-card text-card-foreground shadow-sm">
			<div className={padded ? "p-4 md:p-6" : "p-0"}>{children}</div>
		</div>
	);
}

function SectionTitle({
	Icon,
	children,
}: { Icon: typeof Music; children: ReactNode }) {
	return (
		<h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight mb-4">
			<Icon className="w-4 h-4 text-accent" />
			{children}
		</h3>
	);
}

export const { registry } = defineRegistry(catalog, {
	components: {
		Page: ({ children }) => (
			<div className="min-h-screen bg-gradient-to-b from-violet-50/80 via-background to-background">
				<div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">{children}</div>
			</div>
		),

		Header: ({ props }) => (
			<div className="space-y-1">
				<div className="flex items-center gap-3">
					<div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-sm">
						<Music className="w-6 h-6 text-white" />
					</div>
					<h1 className="text-3xl font-semibold tracking-tight">
						{props.title}
					</h1>
				</div>
				<p className="text-sm text-muted-foreground">{props.subtitle}</p>
			</div>
		),

		ViewToggle: ({ props, emit }) => {
			const active = props.value;
			const btn = (on: boolean) =>
				`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
					on
						? "bg-accent text-accent-foreground shadow-sm"
						: "bg-muted/50 text-muted-foreground hover:bg-muted"
				}`;
			return (
				<div className="flex gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => emit("selectSongs")}
						className={btn(active === "songs")}
					>
						<Music className="w-4 h-4" />
						履歴
					</button>
					<button
						type="button"
						onClick={() => emit("selectRepertoire")}
						className={btn(active === "repertoire")}
					>
						<ListMusic className="w-4 h-4" />
						レパートリー
					</button>
					<button
						type="button"
						onClick={() => emit("selectArtists")}
						className={btn(active === "artists")}
					>
						<Users className="w-4 h-4" />
						アーティスト統計
					</button>
					<button
						type="button"
						onClick={() => emit("selectAnalysis")}
						className={btn(active === "analysis")}
					>
						<BarChart3 className="w-4 h-4" />
						分析
					</button>
				</div>
			);
		},

		StatGrid: ({ children }) => (
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
		),

		StatCard: ({ props }) => {
			const tone = toneStyles[props.tone] ?? toneStyles.blue;
			const { Icon } = tone;
			return (
				<Panel padded>
					<div className="flex items-start justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">
								{props.label}
							</p>
							<p className="text-3xl font-semibold tracking-tight tabular-nums">
								{props.value}
							</p>
						</div>
						<div className={`p-2 rounded-lg ${tone.wrap}`}>
							<Icon className="w-5 h-5" />
						</div>
					</div>
				</Panel>
			);
		},

		FilterBar: ({ props, bindings }) => {
			const store = useStateStore();
			const [search, setSearch] = useBoundProp<string>(
				props.searchValue,
				bindings?.searchValue,
			);
			const [minScore, setMinScore] = useBoundProp<number>(
				props.minScore,
				bindings?.minScore,
			);
			const typeOptions = (props.typeOptions ?? []) as {
				name: string;
				count: number;
			}[];
			const categoryOptions = (props.categoryOptions ?? []) as {
				name: string;
				count: number;
			}[];

			const categoryChip = (name: string, label: string, count?: number) => {
				const on = props.category === name;
				return (
					<button
						key={name}
						type="button"
						onClick={() =>
							store.update({ "/category": name, "/visibleCount": 100 })
						}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
							on
								? "bg-accent text-accent-foreground shadow-sm"
								: "bg-muted/60 text-muted-foreground hover:bg-muted"
						}`}
					>
						{label}
						{count !== undefined && (
							<span className="ml-1.5 opacity-70 tabular-nums">{count}</span>
						)}
					</button>
				);
			};

			const chip = (name: string, label: string, count: number) => {
				const on = props.scoringType === name;
				return (
					<button
						key={name}
						type="button"
						onClick={() =>
							store.update({ "/scoringType": name, "/visibleCount": 100 })
						}
						className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
							on
								? "bg-accent text-accent-foreground shadow-sm"
								: "bg-muted/60 text-muted-foreground hover:bg-muted"
						}`}
					>
						{label}
						<span className="ml-1.5 opacity-70 tabular-nums">{count}</span>
					</button>
				);
			};

			return (
				<Panel padded>
					<div className="space-y-3">
						<div className="flex flex-col md:flex-row gap-3">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
									placeholder={props.searchPlaceholder}
									value={search ?? ""}
									onChange={(e) => {
										setSearch(e.target.value);
										store.set("/visibleCount", 100);
									}}
								/>
							</div>
							<select
								className="px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer"
								value={props.period}
								onChange={(e) =>
									store.update({
										"/period": e.target.value,
										"/visibleCount": 100,
									})
								}
							>
								<option value="all">全期間</option>
								<option value="1m">直近1ヶ月</option>
								<option value="3m">直近3ヶ月</option>
								<option value="6m">直近6ヶ月</option>
								<option value="1y">直近1年</option>
							</select>
							<select
								className="px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer"
								value={props.era}
								onChange={(e) =>
									store.update({
										"/era": e.target.value,
										"/visibleCount": 100,
									})
								}
								aria-label="曲の年代"
							>
								<option value="all">曲の年代：すべて</option>
								<option value="2020s">2020年代</option>
								<option value="2010s">2010年代</option>
								<option value="2000s">2000年代</option>
								<option value="1990s">1990年代</option>
								<option value="older">1980年代以前</option>
							</select>
							<select
								className="px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer"
								value={minScore ?? 0}
								onChange={(e) => {
									setMinScore(Number(e.target.value));
									store.set("/visibleCount", 100);
								}}
							>
								<option value="0">すべての点数</option>
								<option value="90">90点以上</option>
								<option value="85">85点以上</option>
								<option value="80">80点以上</option>
								<option value="75">75点以上</option>
								<option value="70">70点以上</option>
							</select>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							{chip("all", "すべての形式", props.totalCount)}
							{typeOptions.map((t) => chip(t.name, t.name, t.count))}
							<span className="ml-auto text-xs text-muted-foreground tabular-nums">
								{props.resultCount}件ヒット
							</span>
						</div>
						{categoryOptions.length > 0 && (
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs text-muted-foreground">区分</span>
								{categoryChip("all", "すべて")}
								{categoryOptions.map((c) =>
									categoryChip(c.name, c.name, c.count),
								)}
							</div>
						)}
					</div>
				</Panel>
			);
		},

		ScoreTable: ({ props, emit }) => {
			const store = useStateStore();
			const rows = (props.rows ?? []) as ScoreRow[];
			return (
				<Panel>
					{rows.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground text-sm">
							{props.emptyText}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left min-w-[680px]">
								<thead>
									<tr className="border-b border-border">
										<SortableHeader
											label="日付"
											active={props.sortKey === "date"}
											direction={props.sortDirection}
											onSort={() => emit("sortDate")}
										/>
										<SortableHeader
											label="曲名"
											active={props.sortKey === "songName"}
											direction={props.sortDirection}
											onSort={() => emit("sortSongName")}
										/>
										<SortableHeader
											label="歌手名"
											active={props.sortKey === "artist"}
											direction={props.sortDirection}
											onSort={() => emit("sortArtist")}
										/>
										<SortableHeader
											label="採点形式"
											active={props.sortKey === "scoringType"}
											direction={props.sortDirection}
											onSort={() => emit("sortType")}
										/>
										<SortableHeader
											label="点数"
											align="right"
											active={props.sortKey === "score"}
											direction={props.sortDirection}
											onSort={() => emit("sortScore")}
										/>
									</tr>
								</thead>
								<tbody>
									{rows.map((score) => {
										const { day, time } = splitDate(score.date);
										return (
											<tr
												key={`${score.songName}-${score.artist}-${score.date}-${score.score}`}
												className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
												onClick={() =>
													store.set("/selectedSong", songKey(score))
												}
												tabIndex={0}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														store.set("/selectedSong", songKey(score));
													}
												}}
											>
												<td className="px-4 md:px-6 py-4 text-sm text-muted-foreground whitespace-nowrap tabular-nums">
													{day}
													{time && (
														<span className="block text-xs">{time}</span>
													)}
												</td>
												<td className="px-4 md:px-6 py-4 text-sm font-medium">
													{score.songName}
													{score.metaText && (
														<span className="block text-xs font-normal text-muted-foreground mt-0.5">
															{score.metaText}
														</span>
													)}
												</td>
												<td className="px-4 md:px-6 py-4 text-sm text-muted-foreground">
													{score.artist}
												</td>
												<td className="px-4 md:px-6 py-4">
													<TypeChip scoringType={score.scoringType} />
												</td>
												<td className="px-4 md:px-6 py-4 text-right">
													<ScoreBadge score={score.score} />
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</Panel>
			);
		},

		RepertoireTable: ({ props, emit }) => {
			const store = useStateStore();
			const rows = (props.rows ?? []) as RepertoireRow[];
			return (
				<Panel>
					{rows.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground text-sm">
							{props.emptyText}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left min-w-[680px]">
								<thead>
									<tr className="border-b border-border">
										<SortableHeader
											label="曲名"
											active={props.sortKey === "songName"}
											direction={props.sortDirection}
											onSort={() => emit("sortSongName")}
										/>
										<SortableHeader
											label="歌手名"
											active={props.sortKey === "artist"}
											direction={props.sortDirection}
											onSort={() => emit("sortArtist")}
										/>
										<SortableHeader
											label="最高点"
											align="right"
											active={props.sortKey === "bestScore"}
											direction={props.sortDirection}
											onSort={() => emit("sortBest")}
										/>
										<SortableHeader
											label="平均点"
											align="right"
											active={props.sortKey === "avgScore"}
											direction={props.sortDirection}
											onSort={() => emit("sortAvg")}
										/>
										<SortableHeader
											label="回数"
											align="right"
											active={props.sortKey === "attempts"}
											direction={props.sortDirection}
											onSort={() => emit("sortAttempts")}
										/>
										<SortableHeader
											label="最終日"
											align="right"
											active={props.sortKey === "lastDate"}
											direction={props.sortDirection}
											onSort={() => emit("sortLast")}
										/>
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => (
										<tr
											key={songKey(row)}
											className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
											onClick={() => store.set("/selectedSong", songKey(row))}
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													store.set("/selectedSong", songKey(row));
												}
											}}
										>
											<td className="px-4 md:px-6 py-4 text-sm font-medium">
												{row.songName}
												<span className="flex gap-1 mt-1 flex-wrap">
													{row.types.map((t) => (
														<TypeChip key={t} scoringType={t} />
													))}
												</span>
												{row.metaText && (
													<span className="block text-xs font-normal text-muted-foreground mt-1">
														{row.metaText}
													</span>
												)}
											</td>
											<td className="px-4 md:px-6 py-4 text-sm text-muted-foreground">
												{row.artist}
											</td>
											<td className="px-4 md:px-6 py-4 text-right">
												<ScoreBadge score={row.bestScore} />
											</td>
											<td className="px-4 md:px-6 py-4 text-right text-sm text-muted-foreground tabular-nums">
												{row.avgScore.toFixed(1)}
											</td>
											<td className="px-4 md:px-6 py-4 text-right text-sm text-muted-foreground tabular-nums">
												{row.attempts}回
											</td>
											<td className="px-4 md:px-6 py-4 text-right text-sm text-muted-foreground whitespace-nowrap tabular-nums">
												{splitDate(row.lastDate).day}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</Panel>
			);
		},

		ArtistTable: ({ props, emit }) => {
			const rows = (props.rows ?? []) as ArtistStats[];
			return (
				<Panel>
					<div className="overflow-x-auto">
						<table className="w-full text-left min-w-[560px]">
							<thead>
								<tr className="border-b border-border">
									<SortableHeader
										label="アーティスト"
										active={props.sortKey === "artist"}
										direction={props.sortDirection}
										onSort={() => emit("sortArtist")}
									/>
									<SortableHeader
										label="曲数"
										align="right"
										active={props.sortKey === "songCount"}
										direction={props.sortDirection}
										onSort={() => emit("sortSongCount")}
									/>
									<SortableHeader
										label="平均点"
										align="right"
										active={props.sortKey === "avgScore"}
										direction={props.sortDirection}
										onSort={() => emit("sortAvgScore")}
									/>
									<SortableHeader
										label="最高点"
										align="right"
										active={props.sortKey === "maxScore"}
										direction={props.sortDirection}
										onSort={() => emit("sortMaxScore")}
									/>
									<SortableHeader
										label="最低点"
										align="right"
										active={props.sortKey === "minScore"}
										direction={props.sortDirection}
										onSort={() => emit("sortMinScore")}
									/>
								</tr>
							</thead>
							<tbody>
								{rows.map((stat) => (
									<tr
										key={stat.artist}
										className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
									>
										<td className="px-4 md:px-6 py-4 text-sm font-medium">
											{stat.artist}
										</td>
										<td className="px-4 md:px-6 py-4 text-right text-sm text-muted-foreground tabular-nums">
											{stat.songCount}
										</td>
										<td className="px-4 md:px-6 py-4 text-right">
											<ScoreBadge score={stat.avgScore} />
										</td>
										<td className="px-4 md:px-6 py-4 text-right text-sm text-muted-foreground tabular-nums">
											{stat.maxScore.toFixed(3)}
										</td>
										<td className="px-4 md:px-6 py-4 text-right text-sm text-muted-foreground tabular-nums">
											{stat.minScore.toFixed(3)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>
			);
		},

		AnalysisPanel: ({ props }) => {
			const data = props.data as AnalysisData | undefined;
			if (!data) return null;
			const maxDist = Math.max(...data.distribution.map((d) => d.count), 1);
			return (
				<div className="space-y-6">
					<Panel padded>
						<SectionTitle Icon={CalendarDays}>
							月別の推移（平均点と歌唱数）
						</SectionTitle>
						<div className="flex items-end gap-2 md:gap-3 h-44 overflow-x-auto pb-1">
							{data.monthly.map((point) => {
								const height = Math.max(
									8,
									Math.min(100, ((point.avgScore - 60) / 40) * 100),
								);
								return (
									<div
										key={point.month}
										className="flex-1 min-w-[52px] flex flex-col items-center justify-end h-full gap-1"
									>
										<span className="text-xs font-semibold tabular-nums">
											{point.avgScore.toFixed(1)}
										</span>
										<div
											className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-violet-500/70 to-fuchsia-400/70"
											style={{ height: `${height}%` }}
										/>
										<span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
											{point.month.slice(2).replace("/", "/")}
										</span>
										<span className="text-[11px] text-muted-foreground tabular-nums">
											{point.count}曲
										</span>
									</div>
								);
							})}
						</div>
					</Panel>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Panel padded>
							<SectionTitle Icon={BarChart3}>点数分布</SectionTitle>
							<div className="space-y-2">
								{data.distribution.map((bucket) => (
									<div key={bucket.label} className="flex items-center gap-3">
										<span className="w-14 text-xs text-muted-foreground tabular-nums">
											{bucket.label}点
										</span>
										<div className="flex-1 h-5 rounded bg-muted/60 overflow-hidden">
											<div
												className="h-full rounded bg-gradient-to-r from-violet-500/80 to-fuchsia-400/80"
												style={{
													width: `${(bucket.count / maxDist) * 100}%`,
												}}
											/>
										</div>
										<span className="w-10 text-right text-xs font-medium tabular-nums">
											{bucket.count}件
										</span>
									</div>
								))}
							</div>
						</Panel>

						<Panel padded>
							<SectionTitle Icon={Hash}>採点形式別の成績</SectionTitle>
							<div className="space-y-3">
								{data.byType.map((row) => (
									<div
										key={row.scoringType}
										className="flex items-center justify-between gap-3"
									>
										<TypeChip scoringType={row.scoringType} />
										<span className="text-xs text-muted-foreground tabular-nums">
											{row.count}件
										</span>
										<span className="text-xs text-muted-foreground tabular-nums">
											最高 {row.maxScore.toFixed(3)}
										</span>
										<ScoreBadge score={row.avgScore} />
									</div>
								))}
							</div>
							<p className="mt-4 text-xs text-muted-foreground">
								右のバッジは平均点です。採点形式ごとに点の出方が違うため、形式をまたいだ比較は目安として見てください。
							</p>
						</Panel>
					</div>
				</div>
			);
		},

		ShowMore: ({ props }) => {
			const store = useStateStore();
			if (props.shown >= props.total) return null;
			return (
				<div className="text-center">
					<button
						type="button"
						onClick={() =>
							store.set(
								"/visibleCount",
								Number(store.get("/visibleCount") ?? 100) + 100,
							)
						}
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-muted/60 hover:bg-muted text-sm font-medium text-muted-foreground transition-colors"
					>
						<ChevronDown className="w-4 h-4" />
						もっと見る（{props.shown} / {props.total}件）
					</button>
				</div>
			);
		},

		SongDetailModal: ({ props }) => {
			const store = useStateStore();
			const detail = props.detail as SongDetail | null;

			useEffect(() => {
				const onKey = (e: KeyboardEvent) => {
					if (e.key === "Escape") store.set("/selectedSong", "");
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [store]);

			if (!detail) return null;
			const close = () => store.set("/selectedSong", "");

			return (
				<div
					className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
					onClick={close}
					onKeyDown={(e) => {
						if (e.key === "Escape") close();
					}}
				>
					<div
						className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card text-card-foreground shadow-xl"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<div className="sticky top-0 bg-card/95 backdrop-blur px-6 py-4 border-b border-border flex items-start justify-between gap-4">
							<div>
								<h2 className="text-lg font-semibold tracking-tight">
									{detail.songName}
								</h2>
								<p className="text-sm text-muted-foreground">{detail.artist}</p>
								<div className="flex gap-1 mt-2 flex-wrap">
									{detail.types.map((t) => (
										<TypeChip key={t} scoringType={t} />
									))}
								</div>
								{detail.metaText && (
									<p className="text-xs text-muted-foreground mt-2">
										{detail.metaText}
									</p>
								)}
							</div>
							<button
								type="button"
								onClick={close}
								className="p-2 rounded-lg hover:bg-muted transition-colors"
								aria-label="閉じる"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-border">
							<div>
								<p className="text-xs text-muted-foreground">最高点</p>
								<p className="text-xl font-semibold tabular-nums">
									{detail.bestScore.toFixed(3)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">平均点</p>
								<p className="text-xl font-semibold tabular-nums">
									{detail.avgScore.toFixed(1)}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">歌唱回数</p>
								<p className="text-xl font-semibold tabular-nums">
									{detail.count}回
								</p>
							</div>
						</div>

						<div className="px-6 py-2">
							{detail.attempts.map((attempt, i) => {
								const older = detail.attempts[i + 1];
								const delta = older ? attempt.score - older.score : null;
								const isBest = attempt.score === detail.bestScore;
								const { day, time } = splitDate(attempt.date);
								return (
									<div
										key={`${attempt.date}-${attempt.score}-${attempt.scoringType}`}
										className="flex items-center gap-3 py-3 border-b border-border last:border-0"
									>
										<span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums w-32">
											{day}
											{time && <span className="block text-xs">{time}</span>}
										</span>
										<TypeChip scoringType={attempt.scoringType} />
										{isBest && (
											<span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
												<Award className="w-3.5 h-3.5" />
												ベスト
											</span>
										)}
										<span className="ml-auto flex items-center gap-2">
											{delta !== null && (
												<span
													className={`text-xs tabular-nums ${
														delta > 0
															? "text-green-600"
															: delta < 0
																? "text-red-500"
																: "text-muted-foreground"
													}`}
												>
													{delta > 0 ? "+" : ""}
													{delta.toFixed(3)}
												</span>
											)}
											<ScoreBadge score={attempt.score} />
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			);
		},

		StatusMessage: ({ props }) => (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center space-y-2">
					<p className="text-muted-foreground">{props.title}</p>
					{props.hint && (
						<p className="text-sm text-muted-foreground">{props.hint}</p>
					)}
				</div>
			</div>
		),

		Footer: ({ props }) =>
			props.text ? (
				<div className="text-center text-xs text-muted-foreground pb-4">
					<p>{props.text}</p>
				</div>
			) : null,
	},
});
