import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const adBlock = await prisma.adBlock.findFirst({
            where: { name: "paragrafo2" },
        });

        return NextResponse.json({
            code: adBlock?.code
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
