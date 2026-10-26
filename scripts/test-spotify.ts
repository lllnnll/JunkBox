import 'dotenv/config';
import { defaultCredentials, getAppSpotifyApi } from '../src/lib/spotify';

async function main() {
    console.log('Testing Spotify Connection...');
    try {
        if (!defaultCredentials) throw new Error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set');
        const spotifyApi = await getAppSpotifyApi(defaultCredentials);
        console.log('Token received successfully.');

        const data = await spotifyApi.searchTracks('Daft Punk');
        const firstTrack = data.body.tracks?.items[0];

        if (firstTrack) {
            console.log(`Success! Found track: ${firstTrack.name} by ${firstTrack.artists[0].name}`);
        } else {
            console.error('Search returned no results.');
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
