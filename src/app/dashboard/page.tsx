"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Loader2, LogOut, Music } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      const fetchRoom = async () => {
        try {
          const res = await fetch("/api/room");
          const data = await res.json();
          if (data.room) {
            setRoom(data.room);
          } else {
            setError("You don't have a room yet. Ask an admin to enable you as a host.");
          }
        } catch (err) {
          setError("Failed to load your room");
        } finally {
          setLoading(false);
        }
      };

      fetchRoom();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Music className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold">JunkBox Host Dashboard</h1>
          </div>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* User Info */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50 mb-8">
          <p className="text-gray-300 mb-2">Logged in as:</p>
          <p className="text-2xl font-bold text-green-400">{session?.user?.email}</p>
        </div>

        {/* Room Info */}
        {error ? (
          <div className="bg-red-600/20 border border-red-500 rounded-lg p-6 text-center">
            <p className="text-lg">{error}</p>
          </div>
        ) : room ? (
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-lg p-8 border border-green-500/30">
            <h2 className="text-2xl font-bold mb-4">Your Room</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Room Email</p>
                <p className="text-lg font-mono text-green-400">{room.email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Room URL</p>
                <p className="text-lg font-mono text-green-400">
                    {typeof window !== 'undefined' && `${window.location.origin}${room.url}`.split('%')[0]}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Share with guests</p>
                <p className="text-sm text-gray-300">
                  Give guests your email address above and they can join your room from the home page.
                </p>
              </div>
              <button
                onClick={() => router.push(room.url.split('%')[0])}
                className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold transition w-full"
              >
                Enter Your Room
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
