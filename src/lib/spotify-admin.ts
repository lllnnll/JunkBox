import type { SpotifyApp, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSpotifyApi, TOKEN_EXPIRY_MARGIN_S } from "@/lib/spotify";
import { getAppCredentials } from "@/lib/spotify-apps";

type SpotifyHost = Pick<User, 'id' | 'refreshToken' | 'accessToken' | 'expiresAt'> & {
    // The app the refresh token was issued for (null = default app)
    spotifyApp: SpotifyApp | null;
};

// One refresh in flight per host, so parallel polls don't all hit Spotify
const pendingRefreshes = new Map<string, Promise<string>>();

async function refreshHostAccessToken(host: SpotifyHost & { refreshToken: string }) {
    const api = createSpotifyApi(getAppCredentials(host.spotifyApp));
    api.setRefreshToken(host.refreshToken);
    const data = await api.refreshAccessToken();

    const accessToken = data.body['access_token'];
    await prisma.user.update({
        where: { id: host.id },
        data: {
            accessToken,
            expiresAt: Math.floor(Date.now() / 1000) + data.body['expires_in'],
            // Spotify may rotate the refresh token
            ...(data.body['refresh_token'] ? { refreshToken: data.body['refresh_token'] } : {}),
        },
    });

    return accessToken;
}

/**
 * Returns an API instance acting as the given room host (playback control, now playing...).
 * The access token stored in DB is reused until it expires.
 */
export async function getHostSpotifyApi(host: SpotifyHost) {
    if (!host.refreshToken) {
        throw new Error("Host has no Spotify refresh token");
    }

    const now = Math.floor(Date.now() / 1000);
    if (host.accessToken && host.expiresAt && host.expiresAt - TOKEN_EXPIRY_MARGIN_S > now) {
        // Playback calls only need the access token, no need to decrypt the app secret
        const api = createSpotifyApi();
        api.setAccessToken(host.accessToken);
        return api;
    }

    let refresh = pendingRefreshes.get(host.id);
    if (!refresh) {
        refresh = refreshHostAccessToken({ ...host, refreshToken: host.refreshToken })
            .finally(() => pendingRefreshes.delete(host.id));
        pendingRefreshes.set(host.id, refresh);
    }

    const api = createSpotifyApi();
    api.setAccessToken(await refresh);
    return api;
}
