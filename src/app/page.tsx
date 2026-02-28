"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Music, User as UserIcon, Loader2 } from "lucide-react";

interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  albumArt: string;
}

export default function GuestPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Load user name from local storage
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.tracks) {
        setResults(data.tracks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) searchTracks(query);
      else setResults([]);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Clear feedback after delay
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const addToQueue = async (track: Track) => {
    setAddingId(track.id);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyUri: track.uri,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
          userName: userName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || "Une erreur est survenue." });
        return;
      }

      setFeedback({ type: 'success', text: `"${track.title}" a été ajouté à la file !` });
      setResults([]);
      setQuery("");
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', text: "Impossible de contacter le serveur." });
    } finally {
      setAddingId(null);
    }
  };

  if (!isNameSet) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-950 text-white">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter">junkbox</h1>
            <p className="text-zinc-400">Join the party. What&apos;s your name?</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your Name (e.g. Nick)"
              className="w-full h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-green-500 outline-none transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full h-12 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white pb-20">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">junkbox</h1>
          <button
            onClick={() => setIsNameSet(false)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <UserIcon size={14} />
            {userName}
          </button>
        </div>
      </header>

      <div className="w-full max-w-md mx-auto p-4 space-y-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song..."
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-green-500 outline-none text-lg placeholder:text-zinc-600 transition-all shadow-lg"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-green-500" size={20} />
            </div>
          )}
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className={`p-4 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
            }`}>
            {feedback.text}
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {results.length === 0 && !query && (
            <div className="text-center py-20 text-zinc-600">
              <Music size={48} className="mx-auto mb-4 opacity-20" />
              <p>Search for your favorite tracks</p>
            </div>
          )}

          {results.map((track) => (
            <div
              key={track.id}
              className="group flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all"
            >
              <img
                src={track.albumArt}
                alt={`${track.title} album art`}
                className="w-16 h-16 rounded-lg object-cover shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{track.title}</h3>
                <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
              </div>
              <button
                onClick={() => addToQueue(track)}
                disabled={addingId === track.id}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-green-500 hover:text-black transition-colors disabled:opacity-50"
              >
                {addingId === track.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={20} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
