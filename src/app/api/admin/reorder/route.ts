import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { orderedIds } = body;

        if (!Array.isArray(orderedIds)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Perform bulk update of positions
        // Using a transaction to ensure consistency
        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.request.update({
                    where: { id },
                    data: { position: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reorder error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
