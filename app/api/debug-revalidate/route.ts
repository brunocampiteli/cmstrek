import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        revalidatePath("/", "layout");
        revalidatePath("/post/36/aplicativo-para-limpar-memoria-guia-completo-e-seguro");
        return NextResponse.json({ revalidated: true });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
