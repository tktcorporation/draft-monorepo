import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, TrendingUp, Music, Award, ArrowUpDown } from 'lucide-react';

interface KaraokeScore {
  songName: string;
  artist: string;
  score: number;
  date?: string;
  scoringType: string;
}

type SortKey = keyof KaraokeScore;
type SortDirection = 'asc' | 'desc';

function App() {
  const [allScores, setAllScores] = useState<KaraokeScore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    try {
      const response = await fetch('/scores.json');
      if (!response.ok) {
        throw new Error('Failed to load scores');
      }
      const data: KaraokeScore[] = await response.json();
      setAllScores(data);
      setError(null);
    } catch (err) {
      console.error('Error loading scores:', err);
      setError('データを読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }

  const filteredAndSortedScores = useMemo(() => {
    let filtered = allScores.filter(score => {
      const matchesSearch =
        score.songName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        score.artist.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesScore = score.score >= minScore;
      return matchesSearch && matchesScore;
    });

    filtered.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr, 'ja');

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allScores, searchTerm, minScore, sortKey, sortDirection]);

  const stats = useMemo(() => {
    const totalSongs = filteredAndSortedScores.length;
    const avgScore = totalSongs > 0
      ? (filteredAndSortedScores.reduce((sum, s) => sum + s.score, 0) / totalSongs).toFixed(1)
      : '0.0';
    const maxScore = totalSongs > 0
      ? Math.max(...filteredAndSortedScores.map(s => s.score)).toFixed(1)
      : '0.0';

    return { totalSongs, avgScore, maxScore };
  }, [filteredAndSortedScores]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'score' ? 'desc' : 'asc');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-muted-foreground">読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">{error}</p>
              <p className="text-sm text-muted-foreground">
                <code className="px-2 py-1 bg-muted rounded text-xs">npm run scrape</code> を実行してデータを取得してください
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Music className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">カラオケ採点履歴</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            全{allScores.length}曲の採点データ
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">総曲数</p>
                  <p className="text-3xl font-semibold tracking-tight">{stats.totalSongs}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Music className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">平均点</p>
                  <p className="text-3xl font-semibold tracking-tight">{stats.avgScore}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">最高点</p>
                  <p className="text-3xl font-semibold tracking-tight">{stats.maxScore}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-all"
                  placeholder="曲名または歌手名で検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-all cursor-pointer"
                value={minScore}
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
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {filteredAndSortedScores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                検索条件に一致するデータがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        className="text-left px-6 py-4 font-medium text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                        onClick={() => handleSort('songName')}
                      >
                        <div className="flex items-center gap-2">
                          曲名
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          {sortKey === 'songName' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left px-6 py-4 font-medium text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                        onClick={() => handleSort('artist')}
                      >
                        <div className="flex items-center gap-2">
                          歌手名
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          {sortKey === 'artist' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="text-right px-6 py-4 font-medium text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors select-none group"
                        onClick={() => handleSort('score')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          点数
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          {sortKey === 'score' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedScores.map((score, index) => (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium">{score.songName}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{score.artist}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center justify-center min-w-[60px] px-3 py-1 rounded-md text-sm font-semibold ${
                              score.score >= 90
                                ? 'bg-green-50 text-green-700'
                                : score.score >= 85
                                ? 'bg-blue-50 text-blue-700'
                                : score.score >= 80
                                ? 'bg-purple-50 text-purple-700'
                                : score.score >= 75
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {score.score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          {filteredAndSortedScores.length > 0 && (
            <p>{filteredAndSortedScores.length}件の結果を表示中</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
