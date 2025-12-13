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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireEditorOrAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: post.id,
    postNumber: post.postNumber,
    title: post.title,
    slug: post.slug,
    content: post.content,
    coverImageUrl: post.coverImageUrl,
    googlePlayUrl: post.googlePlayUrl,
    language: post.language,
    status: post.status,
    categoryIds: post.categories.map((pc) => pc.categoryId),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireEditorOrAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  const updated = await prisma.post.update({
    where: { id },
    data: {
      title,
      slug,
      content,
      coverImageUrl,
      googlePlayUrl,
      language,
      categories: {
        deleteMany: {},
        createMany: categoryIds?.length
          ? {
            data: categoryIds.map((id: string) => ({ categoryId: id })),
          }
          : undefined,
      },
    },
  });

  revalidatePath("/", "layout");

  return NextResponse.json({ id: updated.id }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireEditorOrAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Remover relações de categorias antes de apagar o post
  await prisma.postCategory.deleteMany({ where: { postId: id } });

  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
