import SpotifyWebApi from 'spotify-web-api-node';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

export const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
});

/**
 * Ensures the API instance has a valid access token for Client Credentials flow.
 * Note: This token cannot access user private data, only public data like search.
 */
export async function getClientCredentialsToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        return data.body['access_token'];
    } catch (err) {
        console.error('Something went wrong when retrieving an access token', err);
        throw err;
    }
}
