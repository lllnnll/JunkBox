import { NextRequest, NextResponse } from 'next/server';
import { defaultCredentials } from '@/lib/spotify';
import { getSpotifyAppByClientId, registerSpotifyApp, SPOTIFY_APP_COOKIE } from '@/lib/spotify-apps';

// Spotify client IDs and secrets are 32 hex characters
const SPOTIFY_KEY_PATTERN = /^[a-f0-9]{32}$/i;

function withAppCookie(response: NextResponse, clientId: string) {
    response.cookies.set(SPOTIFY_APP_COOKIE, clientId, {
        httpOnly: true,
        // lax: the cookie must come back on the redirect from Spotify to the callback
        sameSite: 'lax',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    });
    return response;
}

/**
 * Setup info: the redirect URI to add in the Spotify app, and the app currently remembered
 */
export async function GET(request: NextRequest) {
    const app = await getSpotifyAppByClientId(request.cookies.get(SPOTIFY_APP_COOKIE)?.value);

    return NextResponse.json({
        // new URL() avoids a double slash when NEXTAUTH_URL ends with "/"
        redirectUri: new URL('/api/auth/callback/spotify', process.env.NEXTAUTH_URL).toString(),
        clientId: app?.clientId ?? null,
        defaultAppAvailable: defaultCredentials !== null,
    });
}

/**
 * Choose the Spotify app to sign in with.
 * With a secret: register or update the app. Without: reuse an already registered app.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const clientId = String(body.clientId ?? '').trim();
        const clientSecret = String(body.clientSecret ?? '').trim();

        if (!SPOTIFY_KEY_PATTERN.test(clientId)) {
            return NextResponse.json({ error: 'Invalid Client ID' }, { status: 400 });
        }

        if (clientSecret) {
            if (!SPOTIFY_KEY_PATTERN.test(clientSecret)) {
                return NextResponse.json({ error: 'Invalid Client Secret' }, { status: 400 });
            }

            const valid = await registerSpotifyApp({ clientId, clientSecret });
            if (!valid) {
                return NextResponse.json({ error: 'Spotify rejected this Client ID / Client Secret' }, { status: 400 });
            }
        } else if (!(await getSpotifyAppByClientId(clientId))) {
            return NextResponse.json({ error: 'Unknown app, please also enter its Client Secret' }, { status: 404 });
        }

        return withAppCookie(NextResponse.json({ success: true }), clientId);
    } catch (error) {
        console.error('Spotify app setup error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Forget the remembered app: next sign in uses JunkBox's default app
 */
export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SPOTIFY_APP_COOKIE);
    return response;
}
