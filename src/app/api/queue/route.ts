import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { getAdminSpotifyApi } from '@/lib/spotify-admin';

/**
 * DEPRECATED: This endpoint is maintained for backward compatibility.
 * New requests should use /{roomEmail}/api/queue instead.
 * 
 * This endpoint will fail as rooms are now required for all operations.
 */

export async function POST(request: Request) {
    return NextResponse.json({ 
        error: 'This endpoint is deprecated. Please use /{roomEmail}/api/queue instead.' 
    }, { status: 410 });
}

export async function GET() {
    return NextResponse.json({ 
        error: 'This endpoint is deprecated. Please use /{roomEmail}/api/queue instead.' 
    }, { status: 410 });
}

export async function DELETE(request: Request) {
    return NextResponse.json({ 
        error: 'This endpoint is deprecated. Please use /{roomEmail}/api/queue instead.' 
    }, { status: 410 });
}

