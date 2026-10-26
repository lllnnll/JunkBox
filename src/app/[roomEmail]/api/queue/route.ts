import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { getHostSpotifyApi } from '@/lib/spotify-admin';
import { getRoomBySlug, getRoomSetting, isRoomActiveBySlug, isRoomOwner } from '@/lib/room';

const AUTO_ADVANCE_THRESHOLD_MS = 10000;

async function claimNextPendingRequest(roomId: string) {
    return prisma.$transaction(async (tx) => {
        const nextPending = await tx.request.findFirst({
            where: {
                roomId,
                status: 'PENDING',
            },
            orderBy: [
                { position: 'asc' },
                { createdAt: 'asc' },
            ],
        });

        if (!nextPending) {
            return null;
        }

        const claimed = await tx.request.updateMany({
            where: {
                id: nextPending.id,
                status: 'PENDING',
            },
            data: {
                status: 'PLAYING',
            },
        });

        if (claimed.count === 0) {
            return null;
        }

        return nextPending;
    });
}

async function syncCurrentlyPlayingRequest(roomId: string, spotifyUri: string) {
    await prisma.$transaction(async (tx) => {
        const matchingPlayingRequest = await tx.request.findFirst({
            where: {
                roomId,
                status: 'PLAYING',
                spotifyUri,
            },
            orderBy: [
                { position: 'asc' },
                { createdAt: 'asc' },
            ],
        });

        if (matchingPlayingRequest) {
            await tx.request.update({
                where: { id: matchingPlayingRequest.id },
                data: { status: 'PLAYED' },
            });
            return;
        }

        const pendingMatchingRequest = await tx.request.findFirst({
            where: {
                roomId,
                status: 'PENDING',
                spotifyUri,
            },
            orderBy: [
                { position: 'asc' },
                { createdAt: 'asc' },
            ],
        });

        if (!pendingMatchingRequest) {
            return;
        }

        await tx.request.update({
            where: { id: pendingMatchingRequest.id },
            data: { status: 'PLAYED' },
        });
    });
}

function formatDurationFr(totalSeconds: number): string {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    if (minutes === 0) {
        return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
    }

    if (seconds === 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    return `${minutes} minute${minutes > 1 ? 's' : ''} et ${seconds} seconde${seconds > 1 ? 's' : ''}`;
}

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
                        error: `Veuillez patienter ${formatDurationFr(remaining)} avant de rajouter une musique.`,
                        remainingSeconds: remaining
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

        return NextResponse.json({
            success: true,
            request: newRequest,
            queuedOnSpotify: false
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
            const spotify = await getHostSpotifyApi(room.host);
            const playback = await spotify.getMyCurrentPlayingTrack();

            if (playback.body && playback.body.item) {
                const item = playback.body.item as SpotifyApi.TrackObjectFull;

                await syncCurrentlyPlayingRequest(room.id, item.uri);

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
                        roomId: room.id,
                        status: {
                            in: ['PLAYING', 'PLAYED', 'PENDING']
                        }
                    },
                    orderBy: [
                        { status: 'asc' },
                        { createdAt: 'desc' }
                    ]
                });
                if (dbRequest) {
                    currentTrack.requestedBy = dbRequest.requestedBy;
                }

                const progressMs = playback.body.progress_ms ?? 0;
                const durationMs = item.duration_ms ?? 0;
                const remainingMs = durationMs - progressMs;
                const shouldAutoAdvance =
                    playback.body.is_playing &&
                    durationMs > 0 &&
                    remainingMs <= AUTO_ADVANCE_THRESHOLD_MS;

                if (shouldAutoAdvance) {
                    const alreadyQueuedFromDb = await prisma.request.count({
                        where: {
                            roomId: room.id,
                            status: 'PLAYING',
                        },
                    });

                    if (alreadyQueuedFromDb === 0) {
                        const nextRequest = await claimNextPendingRequest(room.id);
                        if (nextRequest) {
                            try {
                                await spotify.addToQueue(nextRequest.spotifyUri);
                            } catch (queueError) {
                                await prisma.request.updateMany({
                                    where: {
                                        id: nextRequest.id,
                                        status: 'PLAYING',
                                    },
                                    data: {
                                        status: 'PENDING',
                                    },
                                });
                                throw queueError;
                            }
                        }
                    }
                }
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

        return NextResponse.json({
            room: { slug: room.slug, name: room.name },
            requests,
            currentTrack
        });
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

    if (!isRoomOwner(session, room)) {
        return NextResponse.json({ error: 'Only the room host can do this' }, { status: 403 });
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
