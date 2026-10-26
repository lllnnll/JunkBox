import NextAuth, { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import type { SpotifyApp } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom } from "@/lib/room";
import { getAppCredentials, getSpotifyAppByClientId, SPOTIFY_APP_COOKIE } from "@/lib/spotify-apps";

const scopes = [
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state",
].join(",");

/**
 * Auth options using the given Spotify app to sign in (null = default app from .env)
 */
function buildAuthOptions(spotifyApp: SpotifyApp | null): NextAuthOptions {
    const { clientId, clientSecret } = getAppCredentials(spotifyApp);

    return {
        providers: [
            SpotifyProvider({
                clientId,
                clientSecret,
                authorization: {
                    params: {
                        scope: scopes,
                        show_dialog: true,
                        access_type: 'offline',
                        prompt: 'consent'
                    },
                },
            }),
        ],
        callbacks: {
            async jwt({ token, account }) {
                if (account) {
                    token.accessToken = account.access_token;
                    token.refreshToken = account.refresh_token;
                    token.expiresAt = account.expires_at;

                    if (token.email) {
                        try {
                            console.log("Saving/Updating user in DB:", token.email);
                            // Every Spotify user can host their own room
                            const isHost = true;
                            // The refresh token only works with the app that issued it
                            const spotifyAppId = spotifyApp?.id ?? null;
                            const user = await prisma.user.upsert({
                                where: { email: token.email },
                                update: {
                                    name: token.name || "Unknown",
                                    refreshToken: account.refresh_token,
                                    accessToken: account.access_token,
                                    expiresAt: account.expires_at,
                                    isHost,
                                    spotifyAppId,
                                },
                                create: {
                                    email: token.email,
                                    name: token.name || "Unknown",
                                    refreshToken: account.refresh_token,
                                    accessToken: account.access_token,
                                    expiresAt: account.expires_at,
                                    isHost,
                                    spotifyAppId,
                                },
                            });
                            console.log("User upsert success:", user.id, "Refresh Token:", !!user.refreshToken);
                            await getOrCreateRoom(user.email);
                        } catch (e) {
                            console.error("Error saving user token", e)
                        }
                    } else {
                        console.warn("No email in token, cannot save user to DB");
                    }
                }
                return token;
            },
            async session({ session, token }) {
                // @ts-expect-error - accessToken is added to session
                session.accessToken = token.accessToken;
                return session;
            },
        },
        pages: {
            error: "/auth/error",
        },
    };
}

// Used by getServerSession: reading a session doesn't depend on the Spotify app
export const authOptions = buildAuthOptions(null);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function handler(req: NextRequest, context: RouteContext) {
    // Sign in and callback must use the same app: the one chosen on /setup
    const spotifyApp = await getSpotifyAppByClientId(req.cookies.get(SPOTIFY_APP_COOKIE)?.value);
    return NextAuth(req, context, buildAuthOptions(spotifyApp));
}

export { handler as GET, handler as POST };
