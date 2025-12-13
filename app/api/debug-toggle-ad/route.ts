import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Enable it
        await prisma.adBlock.updateMany({
            where: { name: "paragrafo2" },
            data: { isActive: true }
        });

        revalidatePath("/", "layout");

        return NextResponse.json({ status: "Enabled" });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
