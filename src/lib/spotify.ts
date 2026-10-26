import SpotifyWebApi from 'spotify-web-api-node';

export interface SpotifyCredentials {
    clientId: string;
    clientSecret: string;
}

// JunkBox's own Spotify app, used by default and for guest search
export const defaultCredentials: SpotifyCredentials = {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
};

// Refresh tokens a minute before Spotify considers them expired
export const TOKEN_EXPIRY_MARGIN_S = 60;

/**
 * Creates a fresh API instance. Never share an instance between requests:
 * tokens are stored on the instance, so concurrent requests would overwrite each other's.
 */
export function createSpotifyApi(credentials: SpotifyCredentials = defaultCredentials) {
    return new SpotifyWebApi(credentials);
}

let appToken: { value: string; expiresAt: number } | null = null;

/**
 * Returns an API instance authenticated with the Client Credentials flow.
 * Note: This token cannot access user private data, only public data like search.
 */
export async function getAppSpotifyApi() {
    if (!appToken || appToken.expiresAt <= Date.now()) {
        try {
            const data = await createSpotifyApi().clientCredentialsGrant();
            appToken = {
                value: data.body['access_token'],
                expiresAt: Date.now() + (data.body['expires_in'] - TOKEN_EXPIRY_MARGIN_S) * 1000,
            };
        } catch (err) {
            console.error('Something went wrong when retrieving an access token', err);
            throw err;
        }
    }

    const api = createSpotifyApi();
    api.setAccessToken(appToken.value);
    return api;
}
