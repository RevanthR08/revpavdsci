import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  GitBranch,
  LayoutDashboard,
  Shield,
  X,
  History,
  Settings,
  Zap,
} from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  analysisId?: string
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({
  analysisId,
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const router = useRouter()

  const coreItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
  ]

  const analysisItems = analysisId
    ? [
      { href: `/analysis/${analysisId}`, label: "Signals Overview", icon: BarChart3 },
      { href: `/analysis/${analysisId}/findings`, label: "Evidence Box", icon: AlertTriangle },
      { href: `/analysis/${analysisId}/chains`, label: "Attack Correlation", icon: GitBranch },
      { href: `/analysis/${analysisId}/summary`, label: "Forensic Narrative", icon: FileText },
    ]
    : []

  const isActive = (href: string) => {
    if (href === "/") return router.pathname === "/"
    return router.pathname.startsWith(href)
  }

  const navItemClass = (active: boolean) => cn(
    "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-300 relative overflow-hidden",
    active
      ? "border-primary/20 bg-primary/10 text-white active-nav-glow"
      : "border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03] hover:border-white/[0.04]"
  )

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 100 : 300 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-white/5 sidebar-gradient backdrop-blur-3xl flex flex-col shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)]",
          "transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-24 border-b border-white/[0.02] px-6 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0 animate-reveal">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden animate-reveal"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/80 leading-none mb-1">Sentinal</p>
                <p className="text-lg font-bold text-white whitespace-nowrap tracking-tight leading-none">Droid DSI</p>
              </motion.div>
            )}
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden w-10 h-10 rounded-xl border border-white/10 text-zinc-500 hover:text-white bg-white/[0.02]"
          >
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>

        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 overflow-y-auto scrollbar-none px-4 py-8 space-y-10 animate-reveal" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-3">
              {!collapsed && <p className="px-4 mb-4 text-[10px] uppercase font-black tracking-[0.4em] text-zinc-700 leading-none">Command Hub</p>}
              <div className="space-y-1.5">
                {coreItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link href={item.href} className={navItemClass(active)}>
                          <div className={cn("flex-shrink-0 transition-transform duration-300", active && "scale-110")}>
                             <Icon className={cn("w-5 h-5", active ? "text-primary glow-primary" : "text-current")} />
                          </div>
                          {!collapsed && (
                            <span className={cn("font-bold tracking-tight text-sm", active ? "text-white" : "text-inherit")}>
                              {item.label}
                            </span>
                          )}
                          {active && <motion.div layoutId="activeHighlight" className="absolute left-[-12px] w-[5px] h-8 bg-primary rounded-r-full shadow-[0_0_15px_hsla(var(--primary),0.8)]" />}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right" className="bg-[#050506] border-white/10 text-primary font-bold ml-4 rounded-xl px-4 py-2 border shadow-2xl">{item.label}</TooltipContent>}
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {analysisItems.length > 0 && (
              <div className="space-y-3 animate-reveal" style={{ animationDelay: '0.2s' }}>
                {!collapsed && <p className="px-4 mb-4 text-[10px] uppercase font-black tracking-[0.4em] text-zinc-700 leading-none">Investigation BOX</p>}
                <div className="space-y-1.5">
                  {analysisItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link href={item.href} className={navItemClass(active)}>
                            <div className={cn("flex-shrink-0 transition-transform duration-300", active && "scale-110")}>
                               <Icon className={cn("w-5 h-5", active ? "text-primary glow-primary" : "text-current")} />
                            </div>
                            {!collapsed && (
                              <span className={cn("font-bold tracking-tight text-sm", active ? "text-white" : "text-inherit")}>
                                {item.label}
                              </span>
                            )}
                            {active && <motion.div layoutId="activeHighlight" className="absolute left-[-12px] w-[5px] h-8 bg-primary rounded-r-full shadow-[0_0_15px_hsla(var(--primary),0.8)]" />}
                          </Link>
                        </TooltipTrigger>
                         {collapsed && <TooltipContent side="right" className="bg-[#050506] border-white/10 text-primary font-bold ml-4 rounded-xl px-4 py-2 border shadow-2xl">{item.label}</TooltipContent>}
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )}

            {!collapsed && (
              <div className="px-4 pt-10 mt-auto opacity-40 animate-reveal" style={{ animationDelay: '0.3s' }}>
                 <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Link Secure</span>
                 </div>
                 <div className="h-[2px] w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-primary rounded-full shadow-[0_0_8px_hsla(var(--primary),0.5)]" />
                 </div>
                 <p className="text-[9px] mt-3 font-bold text-zinc-600 leading-relaxed uppercase tracking-widest">DSI Encryption Tunnel active at stage-4-uplink.</p>
              </div>
            )}
          </nav>
        </TooltipProvider>

        <div className="p-6 border-t border-white/[0.02] flex items-center justify-between gap-4">
          {!collapsed && (
            <div className="flex-1">
               <ThemeToggle />
            </div>
          )}

          <button
            onClick={onToggle}
            className="h-12 w-12 flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center group shadow-xl"
          >
            {collapsed ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />}
          </button>
        </div>
      </motion.aside>
    </>
  )
}
