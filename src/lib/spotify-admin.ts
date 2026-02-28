import { prisma } from "@/lib/prisma";
import { spotifyApi } from "@/lib/spotify";

export async function getAdminSpotifyApi() {
    const host = await prisma.user.findFirst({
        where: { refreshToken: { not: null } },
        orderBy: { createdAt: 'asc' },
    });

    console.log("host : !?!?" + host);

    if (!host || !host.refreshToken) {
        throw new Error("No host found");
    }

    spotifyApi.setRefreshToken(host.refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(data.body['access_token']);

    return spotifyApi;
}