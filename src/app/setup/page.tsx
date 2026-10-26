"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Music, LogIn, Copy, Check, ExternalLink } from "lucide-react";

export default function SetupPage() {
  const [redirectUri, setRedirectUri] = useState("");
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/spotify-app")
      .then((res) => res.json())
      .then((data) => {
        setRedirectUri(data.redirectUri);
        setSavedClientId(data.clientId);
        setShowForm(!data.clientId);
      })
      .catch(console.error);
  }, []);

  const signInAsHost = () => signIn("spotify", { callbackUrl: "/dashboard" });

  const copyRedirectUri = async () => {
    await navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/spotify-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save your Spotify app");
        return;
      }
      await signInAsHost();
    } catch {
      setError("Failed to save your Spotify app");
    } finally {
      setLoading(false);
    }
  };

  const useDefaultApp = async () => {
    await fetch("/api/spotify-app", { method: "DELETE" });
    await signInAsHost();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-gray-800/50 rounded-lg p-8 backdrop-blur border border-gray-700/50 space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Music className="w-10 h-10 text-green-400" />
            <h1 className="text-3xl font-bold">Host Setup</h1>
          </div>

          {savedClientId && !showForm ? (
            <div className="space-y-4">
              <p className="text-gray-300 text-center">
                Your Spotify app <span className="font-mono text-green-400">{savedClientId.slice(0, 6)}…</span> is ready.
              </p>
              <button
                onClick={signInAsHost}
                className="w-full py-3 bg-green-600 hover:bg-green-700 rounded font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Spotify
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition"
              >
                Use another Spotify app
              </button>
            </div>
          ) : (
            <>
              <ol className="space-y-4 text-sm text-gray-300 list-decimal list-inside">
                <li>
                  Open the{" "}
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-400 hover:underline inline-flex items-center gap-1"
                  >
                    Spotify Developer Dashboard <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  and click <strong>Create app</strong> (any name and description).
                </li>
                <li>
                  In <strong>Redirect URIs</strong>, add exactly:
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-900 rounded text-xs text-green-400 break-all">
                      {redirectUri}
                    </code>
                    <button
                      type="button"
                      onClick={copyRedirectUri}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                      aria-label="Copy redirect URI"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
                <li>
                  Under <strong>Which API/SDKs are you planning to use?</strong>, check <strong>Web API</strong>, then save.
                </li>
                <li>
                  Open the app&apos;s <strong>Settings</strong> and copy its <strong>Client ID</strong> and <strong>Client Secret</strong> below.
                </li>
              </ol>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setError("");
                  }}
                  placeholder="Client ID"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 outline-none transition font-mono text-sm"
                />
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => {
                    setClientSecret(e.target.value);
                    setError("");
                  }}
                  placeholder="Client Secret (not needed if already set up)"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-green-500 outline-none transition font-mono text-sm"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !clientId.trim()}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold flex items-center justify-center gap-2 transition"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? "Checking..." : "Save and sign in with Spotify"}
                </button>
              </form>
            </>
          )}

          <div className="border-t border-gray-600 pt-4 text-center">
            <button
              onClick={useDefaultApp}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              Already allowed on JunkBox&apos;s own Spotify app? Sign in with it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
