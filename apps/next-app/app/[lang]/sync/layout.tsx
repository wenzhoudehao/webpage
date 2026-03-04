import { AdminLayoutClient } from "@/components/admin-layout-client";

export default async function SyncLayout({
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
