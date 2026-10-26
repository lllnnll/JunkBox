import { NextRequest, NextResponse } from 'next/server';
import { getAppSpotifyApi } from '@/lib/spotify';
import { isRoomActiveBySlug } from '@/lib/room';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const roomSlug = request.headers.get('x-room-slug');

    if (!roomSlug) {
        return NextResponse.json({ error: 'Room not found' }, { status: 400 });
    }

    // Verify room is active
    const roomActive = await isRoomActiveBySlug(roomSlug);
    if (!roomActive) {
        return NextResponse.json({ error: 'Room is not active' }, { status: 403 });
    }

    if (!q) {
        return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    try {
        const spotify = await getAppSpotifyApi();

        // Search tracks
        const response = await spotify.searchTracks(q, { limit: 10 });
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
