import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
    try {
        const postId = "cminimm6p000dznesxmyvqszb"; // Post ID
        const lp1CategoryId = "cminj1y2f0000sdwyhlwoq89f"; // LP1 Category ID

        // 1. Check current state
        const before = await prisma.post.findUnique({
            where: { id: postId },
            include: { categories: true }
        });

        // 2. Perform update
        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                categories: {
                    deleteMany: {},
                    createMany: {
                        data: [{ categoryId: lp1CategoryId }]
                    }
                }
            },
            include: { categories: true }
        });

        // 3. Revalidate
        revalidatePath("/", "layout");

        return NextResponse.json({
            before: before?.categories,
            after: updated.categories
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
