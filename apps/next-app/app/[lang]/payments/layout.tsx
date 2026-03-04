import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { AdminLayoutClient } from "@/components/admin-layout-client";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];

  return {
    title: `收款管理 - ${t.admin.metadata.title}`,
    description: "收款管理与核销",
  };
}

export default async function PaymentsLayout({
  params,
  children,
}: Readonly<{
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}>) {
  const { lang } = await params;

  return (
    <AdminLayoutClient locale={lang}>
      {children}
    </AdminLayoutClient>
  );
}
