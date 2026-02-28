"use client";

import { useState, useEffect } from "react";
import { getServerSession } from "next-auth";
import { Clock, Save, CheckCircle2, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
    const [cooldownMin, setCooldownMin] = useState<number>(1);
    const [cooldownSec, setCooldownSec] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings");
            const data = await res.json();
            if (data.cooldownSeconds) {
                setCooldownMin(Math.floor(data.cooldownSeconds / 60));
                setCooldownSec(data.cooldownSeconds % 60);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSaveSettings = async () => {
        setSaving(true);
        setSaveSuccess(false);
        const totalSeconds = (cooldownMin * 60) + cooldownSec;
        try {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cooldownSeconds: totalSeconds }),
            });
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <RefreshCw size={32} className="animate-spin text-zinc-500" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <header className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold">Réglages Admin</h1>
                </header>

                <section className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Délai d&apos;ajout utilisateur</h2>
                            <p className="text-zinc-400">Définit le temps d&apos;attente entre deux demandes de musique par un même invité.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    type="number"
                                    value={cooldownMin}
                                    onChange={(e) => setCooldownMin(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-24 h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-blue-500 outline-none transition-colors text-lg font-medium"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs uppercase font-bold pointer-events-none">min</span>
                            </div>
                            <span className="text-zinc-500 font-bold text-xl">:</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={cooldownSec}
                                    max={59}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value) || 0;
                                        if (val > 59) val = 59;
                                        setCooldownSec(Math.max(0, val));
                                    }}
                                    className="w-24 h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-blue-500 outline-none transition-colors text-lg font-medium"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs uppercase font-bold pointer-events-none">sec</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 h-12 rounded-xl font-bold text-lg transition-all ${saveSuccess
                                    ? "bg-green-500 text-black"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                                } disabled:opacity-50 shadow-lg shadow-blue-900/10`}
                        >
                            {saving ? (
                                <RefreshCw size={20} className="animate-spin" />
                            ) : saveSuccess ? (
                                <CheckCircle2 size={20} />
                            ) : (
                                <Save size={20} />
                            )}
                            {saveSuccess ? "Enregistré" : "Sauvegarder"}
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}
