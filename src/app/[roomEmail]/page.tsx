"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Loader2, Music, User as UserIcon, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";

interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  albumArt: string;
}

export default function RoomPage() {
  const params = useParams();
  const roomSlug = Array.isArray(params.roomEmail) 
    ? params.roomEmail[0] 
    : decodeURIComponent(params.roomEmail as string);
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  const formatCooldown = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const secondsPart = safeSeconds % 60;

    if (minutes === 0) {
      return `${secondsPart}s`;
    }

    return `${minutes}m ${secondsPart.toString().padStart(2, '0')}s`;
  };

  const cooldownActive = remainingCooldown > 0;

  useEffect(() => {
    if (!cooldownActive) return;

    const timer = setInterval(() => {
      setRemainingCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownActive]);

  useEffect(() => {
    const storedName = localStorage.getItem("junkbox_username");
    if (storedName) {
      setUserName(storedName);
      setIsNameSet(true);
    }
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem("junkbox_username", userName);
      setIsNameSet(true);
    }
  };

  const searchTracks = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/${encodeURIComponent(roomSlug)}/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.tracks) {
        setResults(data.tracks);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrackToQueue = async (track: Track) => {
    if (!isNameSet || !userName.trim()) {
      setFeedback({ type: 'error', text: 'Please set your name first' });
      return;
    }

    if (cooldownActive) {
      setFeedback({ type: 'error', text: `⏳ Attends encore ${formatCooldown(remainingCooldown)} avant d’ajouter une musique.` });
      return;
    }

    setAddingId(track.id);
    try {
      const res = await fetch(`/${encodeURIComponent(roomSlug)}/api/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotifyUri: track.uri,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
          userName: userName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: `✨ "${track.title}" added!` });
        setResults([]);
        setQuery('');
        setTimeout(() => setFeedback(null), 3000);
      } else {
        if (res.status === 429 && typeof data.remainingSeconds === 'number') {
          setRemainingCooldown(Math.max(0, data.remainingSeconds));
        }
        setFeedback({ type: 'error', text: data.error || 'Failed to add track' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (error) {
      console.error('Add to queue error:', error);
      setFeedback({ type: 'error', text: 'Failed to add track' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tighter">Add a Song</h1>
          <p className="text-zinc-400">To {roomSlug}</p>
        </header>

        {/* Name Setup */}
        {!isNameSet ? (
          <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8">
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">Your name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
              >
                Continue
              </button>
            </form>
          </section>
        ) : (
          <>
            {/* User Badge */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-green-500" />
                <span className="text-sm">Logged in as <strong className="text-green-400">{userName}</strong></span>
              </div>
              <button
                onClick={() => {
                  setIsNameSet(false);
                  setUserName("");
                  localStorage.removeItem("junkbox_username");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Change
              </button>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div className={`p-4 rounded-lg border ${
                feedback.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {feedback.text}
              </div>
            )}

            {cooldownActive && (
              <div className="p-4 rounded-lg border bg-orange-500/10 border-orange-500/30 text-orange-300 flex items-center justify-between">
                <span className="text-sm">Prochain ajout disponible dans</span>
                <span className="text-lg font-semibold tabular-nums">{formatCooldown(remainingCooldown)}</span>
              </div>
            )}

            {/* Search Section */}
            <section className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    searchTracks(e.target.value);
                  }}
                  placeholder="Search songs, artists..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50 transition-colors"
                />
                {loading && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-green-500" />}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-2 bg-zinc-900/50 border border-white/5 rounded-2xl p-4 max-h-96 overflow-y-auto">
                  {results.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/70 transition-all group"
                    >
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate group-hover:text-green-300 transition-colors">{track.title}</h4>
                        <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                      </div>
                      <button
                        onClick={() => addTrackToQueue(track)}
                        disabled={addingId === track.id || cooldownActive}
                        className="p-2.5 hover:bg-green-600/20 text-green-400 hover:text-green-300 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Add to queue"
                      >
                        {addingId === track.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {query && !loading && results.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tracks found</p>
                </div>
              )}
            </section>

            {/* Quick Links */}
            <section className="border-t border-white/5 pt-8 space-y-3">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Quick Links</p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`/${encodeURIComponent(roomSlug)}/display`}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-900 transition-all group"
                >
                  <span className="text-sm font-medium">Now Playing</span>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href={`/${encodeURIComponent(roomSlug)}/admin`}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-900 transition-all group"
                >
                  <span className="text-sm font-medium">Admin</span>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
