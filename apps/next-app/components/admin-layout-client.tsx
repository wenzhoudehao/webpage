"use client"

import { usePathname } from "next/navigation"
import { LeftNav } from "@/components/left-nav"

interface AdminLayoutClientProps {
  children: React.ReactNode
  locale: string
}

export function AdminLayoutClient({ children, locale }: AdminLayoutClientProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen">
      <LeftNav currentPath={pathname} locale={locale} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
