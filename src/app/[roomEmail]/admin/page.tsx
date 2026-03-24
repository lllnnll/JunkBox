"use client";

import { useEffect, useState } from "react";
import { Trash2, Play, Pause, SkipForward, Settings, GripVertical } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface RequestItem {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    requestedBy: string;
    createdAt: string;
}

interface Track {
    title: string;
    artist: string;
}

export default function AdminPage() {
    const params = useParams();
    const roomSlug = Array.isArray(params.roomEmail) 
        ? params.roomEmail[0] 
        : decodeURIComponent(params.roomEmail as string);
    
    const router = useRouter();
    const { data: session } = useSession();

    const [queue, setQueue] = useState<RequestItem[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState<number>(0);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (session === null) {
            router.push(`/${encodeURIComponent(roomSlug)}`);
        }
    }, [session, router, roomSlug]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/${encodeURIComponent(roomSlug)}/api/queue`);
            const data = await res.json();
            if (data.currentTrack) setCurrentTrack(data.currentTrack);
            if (data.requests) setQueue(data.requests);

            // Fetch cooldown setting
            const settingsRes = await fetch(`/${encodeURIComponent(roomSlug)}/api/admin/settings`);
            const settingsData = await settingsRes.json();
            if (settingsData.cooldown_seconds) setCooldown(settingsData.cooldown_seconds);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [roomSlug]);

    const handleDeleteRequest = async (requestId: string) => {
        setIsLoading(true);
        try {
            await fetch(`/${encodeURIComponent(roomSlug)}/api/queue`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId }),
            });
            await fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        setIsLoading(true);
        try {
            await fetch(`/${encodeURIComponent(roomSlug)}/api/admin/controls`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "skip" }),
            });
            await fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReorder = async (fromIdx: number, toIdx: number) => {
        const fromId = queue[fromIdx]?.id;
        const toId = queue[toIdx]?.id;

        if (!fromId || !toId) return;

        setIsLoading(true);
        try {
            await fetch(`/${encodeURIComponent(roomSlug)}/api/admin/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromId,
                    toId,
                }),
            });
            await fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (idx: number) => {
        setDraggedItem(queue[idx]?.id || null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (targetIdx: number) => {
        const draggedIdx = queue.findIndex(item => item.id === draggedItem);
        if (draggedIdx !== -1 && draggedIdx !== targetIdx) {
            handleReorder(draggedIdx, targetIdx);
        }
        setDraggedItem(null);
    };

    const handleCooldownChange = async (value: number) => {
        setCooldown(value);
        try {
            await fetch(`/${encodeURIComponent(roomSlug)}/api/admin/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cooldown_seconds: value }),
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (!session) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <p>Checking authentication...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Admin Controls</h1>
                    <p className="text-zinc-400">Manage {roomSlug}'s queue</p>
                </div>

                {/* Current Track and Controls */}
                <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Play size={20} />
                        Now Playing
                    </h2>

                    <div className="flex items-center gap-6">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-2xl font-bold truncate">{currentTrack?.title || "No track"}</h3>
                            <p className="text-zinc-400 truncate">{currentTrack?.artist}</p>
                        </div>
                        <button
                            onClick={handleSkip}
                            disabled={isLoading || !currentTrack}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-semibold transition-colors"
                        >
                            <SkipForward size={20} />
                            Skip
                        </button>
                    </div>
                </section>

                {/* Settings */}
                <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings size={20} />
                        Settings
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-3 text-zinc-300">
                                Cooldown between requests (seconds)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="3600"
                                value={cooldown}
                                onChange={(e) => handleCooldownChange(parseInt(e.target.value))}
                                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-white/10 text-white focus:outline-none focus:border-green-500"
                            />
                            <p className="text-xs text-zinc-500 mt-2">
                                Users must wait this many seconds between adding songs
                            </p>
                        </div>
                    </div>
                </section>

                {/* Queue Management */}
                <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        Queue ({queue.length} items)
                    </h2>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {queue.length === 0 && (
                            <p className="text-zinc-500 py-8 text-center">Queue is empty</p>
                        )}

                        {queue.map((item, idx) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(idx)}
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                                    draggedItem === item.id
                                        ? "bg-zinc-700/50 border-green-500/50 opacity-50"
                                        : "bg-zinc-800/30 border-white/5 hover:border-white/10"
                                }`}
                            >
                                <GripVertical size={18} className="text-zinc-600 cursor-grab" />
                                <span className="w-6 text-center font-mono text-zinc-500">#{idx + 1}</span>
                                <img
                                    src={item.albumArt}
                                    alt={`${item.title} album art`}
                                    className="w-12 h-12 rounded-md object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate">{item.title}</h4>
                                    <p className="text-sm text-zinc-400 truncate">{item.artist}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">By</p>
                                    <p className="text-sm font-medium text-blue-400">{item.requestedBy}</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteRequest(item.id)}
                                    disabled={isLoading}
                                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                                    title="Delete request"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </main>
    );
}
