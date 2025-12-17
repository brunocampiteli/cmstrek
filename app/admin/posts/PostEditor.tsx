"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

type PostEditorProps = {
  initialContent: string;
  onChange: (html: string) => void;
};

export function PostEditor({ initialContent, onChange }: PostEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
      }),
      Image,
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 prose prose-invert max-w-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function setImageFromPrompt() {
    const url = window.prompt("URL da imagem");
    if (!url) return;
    if (!editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  function setLinkFromPrompt() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link", previousUrl || "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className="rounded px-2 py-1 hover:bg-zinc-800"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className="rounded px-2 py-1 hover:bg-zinc-800"
        >
          Redo
        </button>
        <span className="mx-1 h-4 w-px bg-zinc-700" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("bold") ? "bg-zinc-700" : "hover:bg-zinc-800"
          }`}
        >
          Negrito
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("italic") ? "bg-zinc-700" : "hover:bg-zinc-800"
          }`}
        >
          Itálico
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-zinc-700"
              : "hover:bg-zinc-800"
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-zinc-700"
              : "hover:bg-zinc-800"
          }`}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("bulletList") ? "bg-zinc-700" : "hover:bg-zinc-800"
          }`}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("orderedList") ? "bg-zinc-700" : "hover:bg-zinc-800"
          }`}
        >
          Lista num.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded px-2 py-1 ${
            editor.isActive("blockquote") ? "bg-zinc-700" : "hover:bg-zinc-800"
          }`}
        >
          Citação
        </button>
        <button
          type="button"
          onClick={setLinkFromPrompt}
          className="rounded px-2 py-1 hover:bg-zinc-800"
        >
          Link
        </button>
        <button
          type="button"
          onClick={setImageFromPrompt}
          className="rounded px-2 py-1 hover:bg-zinc-800"
        >
          Imagem (URL)
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
