import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const adBlock = await prisma.adBlock.findFirst({
            where: { name: "paragrafo2" },
            include: { excludedCategories: true }
        });

        return NextResponse.json({
            name: adBlock?.name,
            isActive: adBlock?.isActive,
            excludedCategories: adBlock?.excludedCategories
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
