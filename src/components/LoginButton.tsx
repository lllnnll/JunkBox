"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
    return (
        <button
            onClick={() => signIn("spotify")}
            className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
        >
            Sign in with Spotify
        </button>
    );
}
