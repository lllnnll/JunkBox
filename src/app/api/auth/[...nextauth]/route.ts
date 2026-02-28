import NextAuth, { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { prisma } from "@/lib/prisma";

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

export const authOptions: NextAuthOptions = {
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
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
                        const user = await prisma.user.upsert({
                            where: { email: token.email },
                            update: {
                                name: token.name || "Unknown",
                                refreshToken: account.refresh_token,
                                accessToken: account.access_token,
                                expiresAt: account.expires_at,
                            },
                            create: {
                                email: token.email,
                                name: token.name || "Unknown",
                                refreshToken: account.refresh_token,
                                accessToken: account.access_token,
                                expiresAt: account.expires_at,
                            },
                        });
                        console.log("User upsert success:", user.id, "Refresh Token:", !!user.refreshToken);
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
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
