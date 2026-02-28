"use client";

import { useEffect, useState } from "react";
import { Music, Disc, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Track {
    title: string;
    artist: string;
    albumArt: string;
    uri: string;
    isPlaying: boolean;
    requestedBy?: string | null;
}

interface RequestItem {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    requestedBy: string;
    createdAt: string;
}

export default function DisplayPage() {
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [queue, setQueue] = useState<RequestItem[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/queue");
            const data = await res.json();
            if (data.currentTrack) setCurrentTrack(data.currentTrack);
            if (data.requests) setQueue(data.requests);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        const loadInitialData = async () => {
            await fetchData();
        };
        loadInitialData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <main className="min-h-screen bg-zinc-950 text-white flex flex-col p-12 overflow-hidden">

            {/* Header */}
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-4xl font-bold tracking-tighter">JunkBox</h1>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-zinc-400 uppercase tracking-widest text-sm">Live</span>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-16">

                {/* Now Playing Section */}
                <section className="flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-r from-green-600 to-blue-600 rounded-full opacity-25 blur-3xl group-hover:opacity-40 transition-opacity"></div>
                        {currentTrack ? (
                            <img
                                src={currentTrack.albumArt}
                                alt="Album Art"
                                className={`w-96 h-96 rounded-2xl shadow-2xl object-cover ring-2 ring-white/10 ${currentTrack.isPlaying ? 'animate-slow-spin' : ''}`} // Maybe no spin for square art
                            // Let's remove spin for square art, it looks weird.
                            />
                        ) : (
                            <div className="w-96 h-96 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                <Disc size={64} className="opacity-20" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-sm font-medium text-green-500 tracking-widest uppercase">Now Playing</h2>
                        <div className="space-y-2">
                            <h1 className="text-5xl font-bold line-clamp-2">{currentTrack?.title || "Waiting for music..."}</h1>
                            <p className="text-2xl text-zinc-400">{currentTrack?.artist}</p>
                        </div>

                        {currentTrack?.requestedBy && (
                            <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <span className="text-zinc-500 text-sm uppercase tracking-widest block mb-1">Added by</span>
                                <span className="text-xl font-semibold text-blue-400 bg-blue-500/10 px-4 py-1 rounded-full border border-blue-500/20">
                                    {currentTrack.requestedBy}
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Queue Section */}
                <section className="bg-zinc-900/30 rounded-3xl p-8 border border-white/5 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                        <Music className="text-purple-500" />
                        Up Next
                    </h2>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
                        {queue.length === 0 && (
                            <p className="text-zinc-500 italic">Queue is empty. Scan the code to add songs!</p>
                        )}

                        {queue.map((item: RequestItem, idx: number) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/40 border border-white/5">
                                <div className="w-8 text-center font-mono text-zinc-500">#{idx + 1}</div>
                                <img src={item.albumArt} className="w-12 h-12 rounded-lg object-cover" alt={`${item.title} album art`} />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate">{item.title}</h4>
                                    <p className="text-sm text-zinc-400 truncate">{item.artist}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-zinc-500 block">Requested by</span>
                                    <span className="text-sm font-medium text-blue-400">{item.requestedBy}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>

            {/* Footer with QR Code */}
            <footer className="mt-8 pt-8 flex justify-between items-end border-t border-white/5">
                <div className="flex items-center gap-6">
                    <div className="p-3 bg-white rounded-xl shadow-2xl min-w-[124px] min-h-[124px] flex items-center justify-center">
                        {isMounted ? (
                            <QRCodeSVG
                                value={window.location.origin}
                                size={100}
                                level="H"
                            />
                        ) : (
                            <div className="w-[100px] h-[100px] bg-zinc-100 animate-pulse rounded"></div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-green-500">
                            <QrCode size={20} />
                            Ajoute ta musique !
                        </h3>
                        <p className="text-zinc-400">Scanne le QR code pour choisir le prochain son.</p>
                        <p className="text-zinc-600 font-mono text-xs h-4">
                            {isMounted ? window.location.origin.replace(/^https?:\/\//, '') : ''}
                        </p>
                    </div>
                </div>
                <div className="text-zinc-600 text-xs font-medium uppercase tracking-widest pb-1">
                    Powered by JunkBox
                </div>
            </footer>
        </main>
    );
}
