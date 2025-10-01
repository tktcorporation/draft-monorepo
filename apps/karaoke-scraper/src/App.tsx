import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, TrendingUp, Music, Award } from 'lucide-react';

interface KaraokeScore {
  songName: string;
  artist: string;
  score: number;
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

  function getScoreClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'average';
    return 'poor';
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">読み込み中...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              {error}<br />
              <code className="text-sm">npm run scrape</code> を実行してデータを取得してください。
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
          <Music className="w-10 h-10" />
          カラオケ採点履歴
        </h1>
      </div>

      <Card className="bg-white/95 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="曲名または歌手名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Music className="w-4 h-4" />
              総曲数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalSongs}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              平均点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgScore}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Award className="w-4 h-4" />
              最高点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.maxScore}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/95 backdrop-blur">
        <CardContent className="pt-6">
          {filteredAndSortedScores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              検索条件に一致するデータがありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('songName')}
                    >
                      曲名{' '}
                      <span className="text-xs ml-1">
                        {sortKey === 'songName' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </span>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('artist')}
                    >
                      歌手名{' '}
                      <span className="text-xs ml-1">
                        {sortKey === 'artist' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </span>
                    </th>
                    <th
                      className="text-left p-4 cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('score')}
                    >
                      点数{' '}
                      <span className="text-xs ml-1">
                        {sortKey === 'score' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedScores.map((score, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-4">{score.songName}</td>
                      <td className="p-4">{score.artist}</td>
                      <td className="p-4">
                        <span
                          className={`font-bold text-lg ${
                            score.score >= 90
                              ? 'text-green-600'
                              : score.score >= 80
                              ? 'text-blue-600'
                              : score.score >= 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
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
    </div>
  );
}

export default App;
