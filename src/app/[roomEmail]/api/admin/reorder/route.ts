import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { getRoomBySlug, isRoomActiveBySlug } from '@/lib/room';

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

    try {
        const body = await request.json();
        const { orderedIds } = body;

        if (!Array.isArray(orderedIds)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Perform bulk update of positions for this room only
        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.request.updateMany({
                    where: {
                        id,
                        roomId: room.id,
                        status: 'PENDING',
                    },
                    data: { position: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reorder error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
