import 'dotenv/config';
import { getAppSpotifyApi } from '../src/lib/spotify';

async function main() {
    console.log('Testing Spotify Connection...');
    try {
        const spotifyApi = await getAppSpotifyApi();
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
