import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

async function requireEditorOrAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return null;
  }

  return session;
}

export async function GET(request: Request) {
  const session = await requireEditorOrAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const take = Number(searchParams.get("take") ?? "20");
  const skip = (page - 1) * take;

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      postNumber: true,
      id: true,
      title: true,
      slug: true,
      language: true,
      status: true,
      createdAt: true,
    },
  });

  const serialized = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json(serialized);
}

export async function POST(request: Request) {
  const session = await requireEditorOrAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    title,
    slug,
    content,
    coverImageUrl,
    language,
    categoryIds,
    googlePlayUrl,
  }: {
    title?: string;
    slug?: string;
    content?: string;
    coverImageUrl?: string;
    language?: string;
    categoryIds?: string[];
    googlePlayUrl?: string;
  } = body;

  if (!title || !slug || !content || !coverImageUrl || !language) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const authorId = (session.user as any)?.id as string | undefined;

  if (!authorId) {
    return NextResponse.json({ error: "Missing author" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      coverImageUrl,
      googlePlayUrl,
      language,
      status: "PUBLISHED",
      authorId,
      categories: categoryIds?.length
        ? {
          createMany: {
            data: categoryIds.map((id) => ({ categoryId: id })),
          },
        }
        : undefined,
    },
  });

  revalidatePath("/", "layout");

  return NextResponse.json({ id: post.id, postNumber: post.postNumber }, { status: 201 });
}
