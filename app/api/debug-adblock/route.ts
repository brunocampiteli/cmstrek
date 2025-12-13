import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const adBlock = await prisma.adBlock.findFirst({
            where: { name: "paragrafo2" },
            include: {
                excludedCategories: true,
            },
        });

        return NextResponse.json({
            adBlock: adBlock ? {
                name: adBlock.name,
                excludedCategories: adBlock.excludedCategories
            } : "Not Found"
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
