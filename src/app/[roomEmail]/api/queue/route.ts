import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { getAdminSpotifyApi } from '@/lib/spotify-admin';
import { getRoomBySlug, getRoomSetting, isRoomActiveBySlug } from '@/lib/room';

export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json();
        const { spotifyUri, title, artist, albumArt, userName } = body;

        // Cooldown Check
        if (userName) {
            const lastRequest = await prisma.request.findFirst({
                where: { 
                    requestedBy: userName,
                    roomId: room.id 
                },
                orderBy: { createdAt: 'desc' }
            });

            if (lastRequest) {
                const cooldownSetting = await getRoomSetting(room.id, 'cooldown_seconds');
                const cooldownSeconds = cooldownSetting ? parseInt(cooldownSetting) : 60;
                const cooldownMs = cooldownSeconds * 1000;

                const now = new Date().getTime();
                const lastRequestTime = new Date(lastRequest.createdAt).getTime();
                const diff = now - lastRequestTime;

                if (diff < cooldownMs) {
                    const remaining = Math.ceil((cooldownMs - diff) / 1000);
                    return NextResponse.json({
                        error: `Veuillez patienter ${remaining} secondes avant de rajouter une musique.`
                    }, { status: 429 });
                }
            }
        }

        if (!spotifyUri || !title || !artist) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Get current max position for this room
        const lastRequest = await prisma.request.findFirst({
            where: { 
                status: 'PENDING',
                roomId: room.id 
            },
            orderBy: { position: 'desc' },
            select: { position: true }
        });
        const currentMax = lastRequest?.position ?? -1;
        const nextPosition = currentMax + 1;

        const newRequest = await prisma.request.create({
            data: {
                spotifyUri,
                title,
                artist,
                albumArt: albumArt || '',
                requestedBy: userName || 'Guest',
                position: nextPosition,
                roomId: room.id,
            },
        });

        let queuedOnSpotify = false;
        try {
            const spotify = await getAdminSpotifyApi();
            await spotify.addToQueue(spotifyUri);
            queuedOnSpotify = true;
        } catch (err) {
            console.error('Failed to add to Spotify Queue:', err);
        }

        return NextResponse.json({
            success: true,
            request: newRequest,
            queuedOnSpotify
        });

    } catch (error) {
        console.error('Queue error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
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

        let currentTrack = null;
        try {
            const spotify = await getAdminSpotifyApi();
            const playback = await spotify.getMyCurrentPlayingTrack();

            if (playback.body && playback.body.item) {
                const item = playback.body.item as SpotifyApi.TrackObjectFull;
                currentTrack = {
                    title: item.name,
                    artist: item.artists.map(a => a.name).join(', '),
                    albumArt: item.album.images[0]?.url,
                    uri: item.uri,
                    isPlaying: playback.body.is_playing,
                    requestedBy: null as string | null
                };

                // Try to find who requested this in our DB for this room
                const dbRequest = await prisma.request.findFirst({
                    where: { 
                        spotifyUri: item.uri,
                        roomId: room.id 
                    },
                    orderBy: { createdAt: 'desc' }
                });
                if (dbRequest) {
                    currentTrack.requestedBy = dbRequest.requestedBy;
                }

                // Auto-update status to PLAYED if this track was in our queue
                await prisma.request.updateMany({
                    where: {
                        spotifyUri: item.uri,
                        status: 'PENDING',
                        roomId: room.id
                    },
                    data: {
                        status: 'PLAYED'
                    }
                });
            }
        } catch (e) {
            console.error("Failed to get playback sync and update. Error:", e);
        }

        // Fetch requests for this room AFTER possible status update
        const requests = await prisma.request.findMany({
            take: 20,
            orderBy: [
                { position: 'asc' },
                { createdAt: 'desc' }
            ],
            where: { 
                status: 'PENDING',
                roomId: room.id 
            }
        });

        return NextResponse.json({ requests, currentTrack });
    } catch (error) {
        console.error('Queue GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomSlug = request.headers.get('x-room-slug');
    if (!roomSlug) {
        return NextResponse.json({ error: 'Room not found' }, { status: 400 });
    }

    const room = await getRoomBySlug(roomSlug);
    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        // Verify the request exists and belongs to this room by checking if it exists in this room
        const deleteResult = await prisma.request.deleteMany({
            where: {
                id: requestId,
                roomId: room.id
            }
        });
        
        if (deleteResult.count === 0) {
            return NextResponse.json({ error: 'Request not found in this room' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
