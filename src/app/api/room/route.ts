import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getOrCreateRoom } from '@/lib/room';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const room = await getOrCreateRoom(session.user.email);
        if (!room) {
            return NextResponse.json({ 
                error: 'User is not a host. Contact an administrator to enable room creation.' 
            }, { status: 403 });
        }

        return NextResponse.json({ 
            success: true, 
            room: {
                id: room.id,
                email: room.email,
                slug: room.slug,
                name: room.name,
            }
        });
    } catch (error) {
        console.error('Room creation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const room = await getOrCreateRoom(session.user.email);
        if (!room) {
            return NextResponse.json({ room: null });
        }

        return NextResponse.json({ 
            room: {
                id: room.id,
                email: room.email,
                slug: room.slug,
                name: room.name,
                url: `/${room.slug}`
            }
        });
    } catch (error) {
        console.error('Room fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
