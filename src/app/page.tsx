"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Music, ArrowRight, LogIn } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [roomEmail, setRoomEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!roomEmail.trim()) {
      setError("Please enter a room code or the host's email");
      return;
    }

    setLoading(true);
    try {
      // Verify the room exists
      const res = await fetch(`/${encodeURIComponent(roomEmail.trim())}/api/queue`);
      if (res.status === 403) {
        setError("This room is not active (host not registered)");
        return;
      }
      if (!res.ok) {
        setError("Room not found");
        return;
      }
      
      // Navigate to the room (always by slug, even if the host's email was typed)
      const data = await res.json();
      router.push(`/${data.room?.slug ?? encodeURIComponent(roomEmail.trim())}`);
    } catch (err) {
      setError("Failed to access room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800/50 rounded-lg p-8 backdrop-blur border border-gray-700/50">
          {/* Logo/Title */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Music className="w-10 h-10 text-green-400" />
            <h1 className="text-3xl font-bold">JunkBox</h1>
          </div>

          <p className="text-gray-300 text-center mb-8">
            Collaborative Spotify Queue Management
          </p>

          {/* Host Button (if logged in) */}
          {session ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded font-semibold flex items-center justify-center gap-2 transition mb-4"
            >
              <Music className="w-4 h-4" />
              Host Dashboard
            </button>
          ) : (
            <button
              onClick={() => router.push("/setup")}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded font-semibold flex items-center justify-center gap-2 transition mb-4"
            >
              <LogIn className="w-4 h-4" />
              Sign in as Host
            </button>
          )}

          <div className="border-t border-gray-600 my-6"></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Or Join a Room
              </label>
              <input
                type="text"
                value={roomEmail}
                onChange={(e) => {
                  setRoomEmail(e.target.value);
                  setError("");
                }}
                placeholder="room code or host@example.com"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 outline-none transition"
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Enter Room
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-gray-400 text-sm text-center mt-6">
            Guests: Enter the room code or the host&apos;s email. Hosts: Sign in with Spotify to get your room.
          </p>
        </div>
      </div>
    </div>
  );
}
