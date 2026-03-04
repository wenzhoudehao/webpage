"use client"

import Link from "next/link"
import { Package, CreditCard, Database } from "lucide-react"
import { Logo } from "@/components/ui/logo"

interface LeftNavProps {
  currentPath: string
  locale: string
}

export function LeftNav({ currentPath, locale }: LeftNavProps) {
  const navItems = [
    {
      title: '订单大厅',
      icon: Package,
      href: `/${locale}/po`,
      isActive: currentPath.includes('/po'),
    },
    {
      title: '收款管理',
      icon: CreditCard,
      href: `/${locale}/payments`,
      isActive: currentPath.includes('/payments'),
    },
    {
      title: '数据同步',
      icon: Database,
      href: `/${locale}/sync`,
      isActive: currentPath.includes('/sync'),
    },
  ]

  return (
    <div className="w-14 hover:w-48 transition-all duration-200 ease-inout border-r bg-muted/30 flex flex-col overflow-hidden group">
      {/* Logo */}
      <div className="p-2 border-b flex justify-center group-hover:justify-start">
        <Link href={`/${locale}`}>
          <Logo size="sm" showText={false} />
        </Link>
      </div>

      {/* 导航项 */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
              item.isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {item.title}
            </span>
          </Link>
        ))}
      </nav>

      {/* 底部 */}
      <div className="p-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-xs text-muted-foreground text-center">
          TinyShip 1.7.0
        </div>
      </div>
    </div>
  )
}
