import { NextResponse } from 'next/server';
import { getClientCredentialsToken, spotifyApi } from '@/lib/spotify';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    try {
        // Ensure we have a token
        await getClientCredentialsToken();

        // Search tracks
        const response = await spotifyApi.searchTracks(q, { limit: 10 });
        const tracks = response.body.tracks?.items.map(track => ({
            id: track.id,
            uri: track.uri,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            albumArt: track.album.images[0]?.url || '',
        })) || [];

        return NextResponse.json({ tracks });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
