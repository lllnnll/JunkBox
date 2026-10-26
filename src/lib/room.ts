import type { Session } from 'next-auth';
import { prisma } from './prisma';
import { RESERVED_SLUGS, slugFromEmail } from './room-slug';

/**
 * Get a room by slug, or by host email (guests may type the host's email)
 * @param slugOrEmail - The room slug (e.g., "nikita") or the host's email
 * @returns The room object or null
 */
export async function getRoomBySlug(slugOrEmail: string) {
  try {
    const include = { host: { include: { spotifyApp: true } } };
    if (slugOrEmail.includes('@')) {
      return await prisma.room.findUnique({ where: { email: slugOrEmail }, include });
    }
    const slug = slugOrEmail.toLowerCase();
    const room = await prisma.room.findUnique({ where: { slug }, include });
    if (room) {
      return room;
    }

    // Rooms created before slugs existed: old links use the email prefix, give them a slug now
    const legacyRoom = await prisma.room.findFirst({
      where: { slug: null, email: { startsWith: slug + '@', mode: 'insensitive' } },
    });
    if (!legacyRoom) {
      return null;
    }
    await getOrCreateRoom(legacyRoom.email);
    return await prisma.room.findUnique({ where: { email: legacyRoom.email }, include });
  } catch (error) {
    console.error('Error in getRoomBySlug:', error);
    return null;
  }
}

/**
 * Verify if a room is active by slug
 * @param slug - The room slug
 * @returns true if room is active
 */
export async function isRoomActiveBySlug(slug: string): Promise<boolean> {
  try {
    const room = await getRoomBySlug(slug);
    return room !== null && room.host.isHost && room.host.refreshToken !== null;
  } catch (error) {
    console.error('Error in isRoomActiveBySlug:', error);
    return false;
  }
}

/**
 * Check that the logged in user is the host of the room
 */
export function isRoomOwner(session: Session | null, room: { email: string }): boolean {
  return !!session?.user?.email && session.user.email === room.email;
}

/**
 * Find a slug based on the host email that no other room uses ("nikita", "nikita-2"...)
 */
async function generateUniqueSlug(hostEmail: string): Promise<string> {
  const base = slugFromEmail(hostEmail);

  for (let i = 1; ; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (RESERVED_SLUGS.includes(candidate)) continue;

    const existing = await prisma.room.findUnique({ where: { slug: candidate } });
    if (!existing || existing.email === hostEmail) {
      return candidate;
    }
  }
}

/**
 * Get or create a room for a host user
 * @param hostEmail - The Spotify email of the host
 * @returns The room object or null if host doesn't exist
 */
export async function getOrCreateRoom(hostEmail: string) {
  try {
    // Check if host exists and is actually a host
    const host = await prisma.user.findUnique({
      where: { email: hostEmail },
    });

    if (!host || !host.isHost) {
      return null;
    }

    const existing = await prisma.room.findUnique({ where: { email: hostEmail } });
    if (existing?.slug) {
      return existing;
    }

    // Create the room, or backfill the slug of a room created before slugs existed
    const slug = await generateUniqueSlug(hostEmail);
    const room = await prisma.room.upsert({
      where: { email: hostEmail },
      update: { slug },
      create: {
        email: hostEmail,
        slug,
        name: host.name || hostEmail,
        hostId: host.id,
      },
    });

    return room;
  } catch (error) {
    console.error('Error in getOrCreateRoom:', error);
    return null;
  }
}

/**
 * Get a room by host email
 * @param hostEmail - The Spotify email of the host
 * @returns The room object or null
 */
export async function getRoom(hostEmail: string) {
  try {
    const room = await prisma.room.findUnique({
      where: { email: hostEmail },
      include: {
        host: true,
      },
    });
    return room;
  } catch (error) {
    console.error('Error in getRoom:', error);
    return null;
  }
}

/**
 * Verify if a room is active (host exists and is a host)
 * @param hostEmail - The Spotify email of the host
 * @returns true if room is active
 */
export async function isRoomActive(hostEmail: string): Promise<boolean> {
  try {
    const room = await prisma.room.findUnique({
      where: { email: hostEmail },
      include: {
        host: true,
      },
    });
    return room !== null && room.host.isHost;
  } catch (error) {
    console.error('Error in isRoomActive:', error);
    return false;
  }
}

/**
 * Get a room setting
 * @param roomId - The room ID
 * @param key - The setting key
 * @returns The setting value or null
 */
export async function getRoomSetting(roomId: string, key: string) {
  try {
    const setting = await prisma.roomSetting.findUnique({
      where: {
        roomId_key: {
          roomId,
          key,
        },
      },
    });
    return setting?.value || null;
  } catch (error) {
    console.error('Error in getRoomSetting:', error);
    return null;
  }
}

/**
 * Update a room setting
 * @param roomId - The room ID
 * @param key - The setting key
 * @param value - The setting value
 */
export async function setRoomSetting(
  roomId: string,
  key: string,
  value: string
) {
  try {
    await prisma.roomSetting.upsert({
      where: {
        roomId_key: {
          roomId,
          key,
        },
      },
      update: { value },
      create: { roomId, key, value },
    });
  } catch (error) {
    console.error('Error in setRoomSetting:', error);
  }
}
