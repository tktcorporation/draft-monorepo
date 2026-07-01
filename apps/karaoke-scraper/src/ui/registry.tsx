import { defineRegistry, useBoundProp } from "@json-render/react";
import {
	ArrowUpDown,
	Award,
	Music,
	Search,
	TrendingUp,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { catalog } from "./catalog";
import type { ArtistStats, KaraokeScore } from "./catalog";

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
			className={`inline-flex items-center justify-center min-w-[60px] px-3 py-1 rounded-md text-sm font-semibold ${scoreBadgeClass(
				score,
			)}`}
		>
			{score.toFixed(1)}
		</span>
	);
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
			className="px-6 py-4 font-medium text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none group"
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
};

function Panel({
	children,
	padded,
}: { children: ReactNode; padded?: boolean }) {
	return (
		<div className="rounded-lg border bg-card text-card-foreground shadow-sm border-0">
			<div className={padded ? "p-6" : "p-0"}>{children}</div>
		</div>
	);
}

export const { registry } = defineRegistry(catalog, {
	components: {
		Page: ({ children }) => (
			<div className="min-h-screen bg-background">
				<div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">{children}</div>
			</div>
		),

		Header: ({ props }) => (
			<div className="space-y-1">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-accent/10 rounded-lg">
						<Music className="w-6 h-6 text-accent" />
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
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => emit("selectSongs")}
						className={btn(active === "songs")}
					>
						<Music className="w-4 h-4" />
						曲リスト
					</button>
					<button
						type="button"
						onClick={() => emit("selectArtists")}
						className={btn(active === "artists")}
					>
						<Users className="w-4 h-4" />
						アーティスト統計
					</button>
				</div>
			);
		},

		StatGrid: ({ children }) => (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
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
							<p className="text-3xl font-semibold tracking-tight">
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

		Toolbar: ({ props, bindings }) => {
			const [search, setSearch] = useBoundProp<string>(
				props.searchValue,
				bindings?.searchValue,
			);
			const [minScore, setMinScore] = useBoundProp<number>(
				props.minScore,
				bindings?.minScore,
			);
			return (
				<Panel padded>
					<div className="flex flex-col md:flex-row gap-3">
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
							<input
								type="text"
								className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
								placeholder={props.searchPlaceholder}
								value={search ?? ""}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<select
							className="px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer"
							value={minScore ?? 0}
							onChange={(e) => setMinScore(Number(e.target.value))}
						>
							<option value="0">すべての点数</option>
							<option value="90">90点以上</option>
							<option value="85">85点以上</option>
							<option value="80">80点以上</option>
							<option value="75">75点以上</option>
							<option value="70">70点以上</option>
						</select>
					</div>
				</Panel>
			);
		},

		ScoreTable: ({ props, emit }) => {
			const rows = (props.rows ?? []) as KaraokeScore[];
			return (
				<Panel>
					{rows.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground text-sm">
							{props.emptyText}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left">
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
											label="点数"
											align="right"
											active={props.sortKey === "score"}
											direction={props.sortDirection}
											onSort={() => emit("sortScore")}
										/>
									</tr>
								</thead>
								<tbody>
									{rows.map((score) => (
										<tr
											key={`${score.songName}-${score.artist}-${score.date}-${score.score}`}
											className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
										>
											<td className="px-6 py-4 text-sm font-medium">
												{score.songName}
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{score.artist}
											</td>
											<td className="px-6 py-4 text-right">
												<ScoreBadge score={score.score} />
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
						<table className="w-full text-left">
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
										<td className="px-6 py-4 text-sm font-medium">
											{stat.artist}
										</td>
										<td className="px-6 py-4 text-right text-sm text-muted-foreground">
											{stat.songCount}
										</td>
										<td className="px-6 py-4 text-right">
											<ScoreBadge score={stat.avgScore} />
										</td>
										<td className="px-6 py-4 text-right text-sm text-muted-foreground">
											{stat.maxScore.toFixed(1)}
										</td>
										<td className="px-6 py-4 text-right text-sm text-muted-foreground">
											{stat.minScore.toFixed(1)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>
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
