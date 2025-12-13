import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const post = await prisma.post.findFirst({
            where: { title: { contains: "Limpar Memória" } },
            include: {
                categories: {
                    include: { category: true }
                }
            },
        });

        return NextResponse.json({
            postTitle: post?.title,
            categories: post?.categories.map(c => ({ name: c.category.name, id: c.categoryId }))
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
