import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const category = await prisma.category.findUnique({
            where: { id: "cmii1tl0a0000g743lbyi42bq" },
        });

        return NextResponse.json({ category });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
