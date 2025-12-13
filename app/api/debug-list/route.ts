import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const ads = await prisma.adBlock.findMany();
        return NextResponse.json({ count: ads.length, ads: ads.map(a => ({ name: a.name, isActive: a.isActive })) });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
