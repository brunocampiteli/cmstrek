import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const post = await prisma.post.findUnique({
            where: { id: "cminimm6p000dznesxmyvqszb" },
            select: { content: true }
        });

        return NextResponse.json({
            contentSnippet: post?.content.substring(0, 2000) // First 2000 chars
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
