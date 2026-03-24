import { prisma } from './prisma';

/**
 * Extract slug (part before @) from an email
 */
function getEmailSlug(email: string): string {
  return email.split('@')[0];
}

/**
 * Get a room by slug (username before @)
 * @param slug - The room slug (e.g., "nikita" from "nikita@spotify.com")
 * @returns The room object or null
 */
export async function getRoomBySlug(slug: string) {
  try {
    const room = await prisma.room.findFirst({
      where: {
        email: {
          startsWith: slug + '@',
        },
      },
      include: {
        host: true,
      },
    });
    return room;
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
    return room !== null && room.host.isHost;
  } catch (error) {
    console.error('Error in isRoomActiveBySlug:', error);
    return false;
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

    // Get or create room
    const room = await prisma.room.upsert({
      where: { email: hostEmail },
      update: {},
      create: {
        email: hostEmail,
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
