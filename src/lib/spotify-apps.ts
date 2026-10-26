import type { SpotifyApp } from '@prisma/client';
import { prisma } from './prisma';
import { decrypt, encrypt } from './crypto';
import { createSpotifyApi, defaultCredentials, SpotifyCredentials } from './spotify';

// Remembers which Spotify app a host signs in with (holds the public client ID)
export const SPOTIFY_APP_COOKIE = 'junkbox_spotify_app';

/**
 * Credentials of a host's own Spotify app, or JunkBox's default app when null
 */
export function getAppCredentials(app: SpotifyApp | null): SpotifyCredentials {
    if (!app) {
        if (!defaultCredentials) {
            throw new Error('No Spotify app: set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET or use /setup');
        }
        return defaultCredentials;
    }
    return {
        clientId: app.clientId,
        clientSecret: decrypt(app.clientSecretEncrypted),
    };
}

export async function getSpotifyAppByClientId(clientId: string | undefined) {
    if (!clientId) {
        return null;
    }
    try {
        return await prisma.spotifyApp.findUnique({ where: { clientId } });
    } catch (error) {
        console.error('Error in getSpotifyAppByClientId:', error);
        return null;
    }
}

/**
 * Check the credentials against Spotify, then save them (secret encrypted).
 * Only someone with the right secret can register or update a client ID.
 * @returns false if Spotify rejects the credentials
 */
export async function registerSpotifyApp(credentials: SpotifyCredentials): Promise<boolean> {
    try {
        await createSpotifyApi(credentials).clientCredentialsGrant();
    } catch {
        return false;
    }

    const clientSecretEncrypted = encrypt(credentials.clientSecret);
    await prisma.spotifyApp.upsert({
        where: { clientId: credentials.clientId },
        update: { clientSecretEncrypted },
        create: { clientId: credentials.clientId, clientSecretEncrypted },
    });

    return true;
}
