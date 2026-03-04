"use client";

import { LayoutDashboard, Users, Receipt, Coins, Crown } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const { t, locale: currentLocale } = useTranslation();
  const pathname = usePathname();

  // Admin dashboard item
  const dashboardItem = {
    title: t.navigation.admin.dashboard,
    url: `/admin`,
    icon: LayoutDashboard,
  }

  // 原来的系统管理菜单
  const adminItems = [
    {
      title: t.navigation.admin.users,
      url: `/admin/users`,
      icon: Users,
    },
    {
      title: t.navigation.admin.orders,
      url: `/admin/orders`,
      icon: Receipt,
    },
    {
      title: t.navigation.admin.subscriptions,
      url: `/admin/subscriptions`,
      icon: Crown,
    },
    {
      title: t.navigation.admin.credits,
      url: `/admin/credits`,
      icon: Coins,
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href={`/${currentLocale}`}>
          <Logo size="md" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/${currentLocale}${dashboardItem.url}`}>
                  <Link href={`/${currentLocale}${dashboardItem.url}`}>
                    <dashboardItem.icon />
                    <span>{dashboardItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - 原来的系统管理 */}
        <SidebarGroup>
          <SidebarGroupLabel>{t.navigation.admin.application}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(`/${currentLocale}${item.url}`)}>
                    <Link href={`/${currentLocale}${item.url}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
