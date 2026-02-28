import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const cooldownSetting = await prisma.setting.findUnique({
            where: { key: 'cooldown_seconds' }
        });

        return NextResponse.json({
            cooldownSeconds: cooldownSetting ? parseInt(cooldownSetting.value) : 60
        });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { cooldownSeconds } = body;

        if (cooldownSeconds === undefined || isNaN(parseInt(cooldownSeconds))) {
            return NextResponse.json({ error: 'Invalid cooldown value' }, { status: 400 });
        }

        await prisma.setting.upsert({
            where: { key: 'cooldown_seconds' },
            update: { value: cooldownSeconds.toString() },
            create: { key: 'cooldown_seconds', value: cooldownSeconds.toString() }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
