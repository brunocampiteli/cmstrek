import { prisma } from "@/lib/prisma";
import { AdminLoginForm } from "./AdminLoginForm";

async function getSiteSettings() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    return settings;
  } catch {
    return null;
  }
}

export default async function AdminLoginPage() {
  const settings = await getSiteSettings();

  return <AdminLoginForm logoUrl={settings?.logoUrl ?? null} />;
}
