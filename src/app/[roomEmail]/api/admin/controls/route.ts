import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getRoomBySlug, isRoomActiveBySlug } from '@/lib/room';
import { getAdminSpotifyApi } from '@/lib/spotify-admin';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomSlug = request.headers.get('x-room-slug');
    if (!roomSlug) {
        return NextResponse.json({ error: 'Room not found' }, { status: 400 });
    }

    // Verify room is active
    const roomActive = await isRoomActiveBySlug(roomSlug);
    if (!roomActive) {
        return NextResponse.json({ error: 'Room is not active' }, { status: 403 });
    }

    try {
        const { action } = await request.json();
        const spotify = await getAdminSpotifyApi();

        if (action === 'skip') {
            await spotify.skipToNext();
        } else if (action === 'play') {
            await spotify.play();
        } else if (action === 'pause') {
            await spotify.pause();
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin control error:', error);
        return NextResponse.json({ error: 'Failed to execute command' }, { status: 500 });
    }
}
