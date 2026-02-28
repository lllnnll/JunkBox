"use client";

import { useState, useEffect } from "react";
import { Play, Pause, SkipForward, Trash2, RefreshCw, GripVertical, Clock } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import Link from "next/link";

interface RequestItem {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    requestedBy: string;
    status: string;
}

export default function AdminDashboard() {
    const [queue, setQueue] = useState<RequestItem[]>([]);
    const [currentTrack, setCurrentTrack] = useState<{
        title: string;
        artist: string;
        albumArt: string;
        isPlaying: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/queue");
            const data = await res.json();
            if (data.requests) setQueue(data.requests);
            if (data.currentTrack) setCurrentTrack(data.currentTrack);
        } catch (e) {
            console.error(e);
        }
    };


    useEffect(() => {
        const loadInitData = async () => {
            await fetchData();
        };
        loadInitData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleControl = async (action: string) => {
        try {
            await fetch("/api/admin/controls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            setTimeout(fetchData, 500); // Refresh after action
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this request from the database log? (Note: It may still represent a song in Spotify Queue)")) return;
        try {
            await fetch(`/api/queue?id=${id}`, { method: "DELETE" });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(queue);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setQueue(items);

        try {
            await fetch("/api/admin/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderedIds: items.map(i => i.id)
                }),
            });
        } catch (e) {
            console.error("Failed to save new order:", e);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <div className="flex items-center gap-2">
                    <Link href="/admin/settings" className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <Clock size={20} />
                    </Link>
                    <button onClick={fetchData} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>


            {/* Playback Controls */}
            <section className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col md:flex-row items-center gap-6">
                {currentTrack ? (
                    <img src={currentTrack.albumArt} className="w-24 h-24 rounded-lg shadow-lg" alt={`${currentTrack.title} album art`} />
                ) : (
                    <div className="w-24 h-24 bg-zinc-800 rounded-lg"></div>
                )}

                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold truncate">{currentTrack?.title || "Not Playing"}</h2>
                    <p className="text-zinc-400">{currentTrack?.artist || "Connect a device to Spotify to start"}</p>
                </div>

                <div className="flex items-center gap-4">
                    {currentTrack?.isPlaying ? (
                        <button onClick={() => handleControl('pause')} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors">
                            <Pause size={24} />
                        </button>
                    ) : (
                        <button onClick={() => handleControl('play')} className="p-4 bg-green-500 hover:bg-green-400 text-black rounded-full transition-colors">
                            <Play size={24} fill="currentColor" />
                        </button>
                    )}
                    <button onClick={() => handleControl('skip')} className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors">
                        <SkipForward size={24} />
                    </button>
                </div>
            </section>

            {/* Queue Management */}
            <section>
                <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="queue">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {queue.map((item, index) => (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`flex items-center gap-4 p-4 border-b border-zinc-800 last:border-0 transition-colors ${snapshot.isDragging ? "bg-zinc-800 shadow-2xl z-50" : "hover:bg-zinc-800/50"
                                                        }`}
                                                >
                                                    <div {...provided.dragHandleProps} className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing">
                                                        <GripVertical size={20} />
                                                    </div>
                                                    <img src={item.albumArt} className="w-10 h-10 rounded object-cover" alt={`${item.title} album art`} />
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-sm">{item.title}</h4>
                                                        <div className="flex gap-2 text-xs text-zinc-400">
                                                            <span>{item.artist}</span>
                                                            <span>•</span>
                                                            <span className="text-blue-400">{item.requestedBy}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                                        title="Remove from Log"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                    {queue.length === 0 && (
                        <div className="p-8 text-center text-zinc-500">No active requests found.</div>
                    )}
                </div>
            </section>
        </div>
    );
}
