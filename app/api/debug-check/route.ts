import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // 1. Find the category "LP1"
        const lp1Category = await prisma.category.findFirst({
            where: { name: { contains: "LP1" } },
        });

        // 2. Find the post "Aplicativo para Limpar Memória..."
        const post = await prisma.post.findFirst({
            where: { title: { contains: "Limpar Memória" } },
            include: {
                categories: true,
            },
        });

        // 3. Find the ad block "paragrafo2"
        const adBlock = await prisma.adBlock.findFirst({
            where: { name: "paragrafo2" },
            include: {
                excludedCategories: true,
            },
        });

        // 4. Find the actual categories of the post
        let actualCategories: any[] = [];
        if (post) {
            const postCategoryIds = post.categories.map((pc) => pc.categoryId);
            actualCategories = await prisma.category.findMany({
                where: { id: { in: postCategoryIds } },
            });
        }

        // 5. Check logic
        let isExcluded = false;
        let matchDetails = "No match";

        if (post && adBlock) {
            const postCategoryIds = post.categories.map((pc) => pc.categoryId);
            const excludedCategoryIds = adBlock.excludedCategories.map((c) => c.id);

            const hasExclusion = adBlock.excludedCategories.some((cat) =>
                postCategoryIds.includes(cat.id)
            );

            isExcluded = hasExclusion;
            matchDetails = `Post Cats: [${postCategoryIds.join(", ")}], Excluded Cats: [${excludedCategoryIds.join(", ")}]`;
        }

        return NextResponse.json({
            lp1Category,
            post: post ? { title: post.title, categoryIds: post.categories.map(c => c.categoryId) } : "Not Found",
            actualCategories: actualCategories.map(c => ({ name: c.name, id: c.id })),
            adBlock: adBlock ? { name: adBlock.name, excludedCategories: adBlock.excludedCategories } : "Not Found",
            logicCheck: {
                isExcluded,
                matchDetails
            }
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
