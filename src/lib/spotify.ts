import SpotifyWebApi from 'spotify-web-api-node';

export interface SpotifyCredentials {
    clientId: string;
    clientSecret: string;
}

// Optional default Spotify app from .env, hosts normally bring their own app via /setup
export const defaultCredentials: SpotifyCredentials | null =
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
        ? { clientId: process.env.SPOTIFY_CLIENT_ID, clientSecret: process.env.SPOTIFY_CLIENT_SECRET }
        : null;

// Refresh tokens a minute before Spotify considers them expired
export const TOKEN_EXPIRY_MARGIN_S = 60;

/**
 * Creates a fresh API instance. Never share an instance between requests:
 * tokens are stored on the instance, so concurrent requests would overwrite each other's.
 * Credentials are only needed to get or refresh tokens, not to call the API with an access token.
 */
export function createSpotifyApi(credentials?: SpotifyCredentials) {
    return new SpotifyWebApi(credentials ?? {});
}

// Client Credentials tokens, per Spotify app
const appTokens = new Map<string, { value: string; expiresAt: number }>();

/**
 * Returns an API instance authenticated with the Client Credentials flow of the given app.
 * Note: This token cannot access user private data, only public data like search.
 */
export async function getAppSpotifyApi(credentials: SpotifyCredentials) {
    let token = appTokens.get(credentials.clientId);
    if (!token || token.expiresAt <= Date.now()) {
        try {
            const data = await createSpotifyApi(credentials).clientCredentialsGrant();
            token = {
                value: data.body['access_token'],
                expiresAt: Date.now() + (data.body['expires_in'] - TOKEN_EXPIRY_MARGIN_S) * 1000,
            };
            appTokens.set(credentials.clientId, token);
        } catch (err) {
            console.error('Something went wrong when retrieving an access token', err);
            throw err;
        }
    }

    const api = createSpotifyApi();
    api.setAccessToken(token.value);
    return api;
}
