import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getRoomBySlug, getRoomSetting, setRoomSetting, isRoomActiveBySlug, isRoomOwner } from '@/lib/room';

export async function GET(request: NextRequest) {
    const roomSlug = request.headers.get('x-room-slug');
    if (!roomSlug) {
        return NextResponse.json({ error: 'Room not found' }, { status: 400 });
    }

    // Verify room is active
    const roomActive = await isRoomActiveBySlug(roomSlug);
    if (!roomActive) {
        return NextResponse.json({ error: 'Room is not active' }, { status: 403 });
    }

    const room = await getRoomBySlug(roomSlug);
    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    try {
        const cooldownSetting = await getRoomSetting(room.id, 'cooldown_seconds');

        return NextResponse.json({
            cooldownSeconds: cooldownSetting ? parseInt(cooldownSetting) : 60
        });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

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

    const room = await getRoomBySlug(roomSlug);
    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!isRoomOwner(session, room)) {
        return NextResponse.json({ error: 'Only the room host can do this' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const rawCooldown = body.cooldownSeconds ?? body.cooldown_seconds;
        const cooldownSeconds = Number.parseInt(String(rawCooldown), 10);

        if (!Number.isFinite(cooldownSeconds) || cooldownSeconds < 0) {
            return NextResponse.json({ error: 'Invalid cooldown value' }, { status: 400 });
        }

        await setRoomSetting(room.id, 'cooldown_seconds', cooldownSeconds.toString());

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
