"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  GitBranch,
  Users,
  FileText,
  Settings,
  TrendingUp,
  RefreshCw,
  Table2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAmo } from "@/context/amo-context"

const navItems = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/pipelines", label: "Воронки", icon: GitBranch },
  { href: "/managers", label: "Менеджеры", icon: Users },
  { href: "/deals", label: "Сделки", icon: Table2 },
  { href: "/reports", label: "Отчёты", icon: FileText },
  { href: "/settings", label: "Настройки", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { connection, isSyncing } = useAmo()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-700/50 bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100">ROP Assistant</p>
          <p className="text-xs text-slate-500">Аналитика продаж</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sync status */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5">
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full",
            connection.connected ? "bg-emerald-500/20" : "bg-slate-700"
          )}>
            <RefreshCw className={cn(
              "h-3 w-3",
              connection.connected ? "text-emerald-400" : "text-slate-500",
              isSyncing && "animate-spin"
            )} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300">AmoCRM</p>
            <p className="text-xs text-slate-500">
              {isSyncing ? "Синхронизация..." : connection.connected ? connection.domain + ".amocrm.ru" : "Демо-режим"}
            </p>
          </div>
          <div className={cn(
            "ml-auto h-2 w-2 rounded-full",
            connection.connected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
          )} />
        </div>
      </div>
    </aside>
  )
}
