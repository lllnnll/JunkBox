import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { getAdminSpotifyApi } from '@/lib/spotify-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { spotifyUri, title, artist, albumArt, userName } = body;

        // Cooldown Check
        if (userName) {
            const lastRequest = await prisma.request.findFirst({
                where: { requestedBy: userName },
                orderBy: { createdAt: 'desc' }
            });

            if (lastRequest) {
                const cooldownSetting = await prisma.setting.findUnique({
                    where: { key: 'cooldown_seconds' }
                });
                const cooldownSeconds = cooldownSetting ? parseInt(cooldownSetting.value) : 60;
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

        // Get current max position
        const lastRequest = await prisma.request.findFirst({
            where: { status: 'PENDING' },
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

export async function GET() {
    try {
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

                // Try to find who requested this in our DB
                const dbRequest = await prisma.request.findFirst({
                    where: { spotifyUri: item.uri },
                    orderBy: { createdAt: 'desc' }
                });
                if (dbRequest) {
                    currentTrack.requestedBy = dbRequest.requestedBy;
                }

                // Auto-update status to PLAYED if this track was in our queue
                await prisma.request.updateMany({
                    where: {
                        spotifyUri: item.uri,
                        status: 'PENDING'
                    },
                    data: {
                        status: 'PLAYED'
                    }
                });
            }
        } catch (e) {
            console.error("Failed to get playback sync and update. Error:", e);
        }

        // Fetch requests AFTER possible status update
        const requests = await prisma.request.findMany({
            take: 20,
            orderBy: [
                { position: 'asc' },
                { createdAt: 'desc' }
            ],
            where: { status: 'PENDING' }
        });

        return NextResponse.json({ requests, currentTrack });
    } catch (error) {
        console.error('Queue GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await prisma.request.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
