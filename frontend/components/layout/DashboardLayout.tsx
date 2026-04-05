import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, CalendarClock, Menu, Search, X } from "lucide-react"
import Sidebar from "./Sidebar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  analysisId?: string
  workspaceTitle?: string
}

export default function DashboardLayout({
  children,
  analysisId,
  workspaceTitle = "Forensic Core",
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase()

  return (
    <div className="min-h-screen app-shell-bg text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-white">
      <Sidebar
        analysisId={analysisId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main
        className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          sidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[280px]"
        )}
      >
        <header 
          className={cn(
            "sticky top-0 z-40 transition-all duration-300",
            scrolled ? "h-16 bg-[#020203]/80 backdrop-blur-2xl border-b border-white/[0.04]" : "h-24 bg-transparent border-transparent"
          )}
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="h-full px-6 sm:px-10 flex items-center justify-between gap-6 max-w-[1720px] mx-auto">
            <div className="flex items-center gap-5 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-white"
              >
                <Menu className="w-5 h-5 mx-auto" />
              </Button>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex w-[2px] h-10 bg-primary/20 rounded-full" />
                <div className="animate-reveal">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Sentinel Ops</p>
                    <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(37,99,235,0.1)]">
                       <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                       <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Live Signal</span>
                    </div>
                  </div>
                  <h1 className="text-xl font-bold text-white tracking-tight leading-none truncate max-w-[200px] sm:max-w-none">
                    {workspaceTitle}
                  </h1>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex flex-1 max-w-xl relative mx-8 animate-reveal" style={{ animationDelay: '0.1s' }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Query forensic nodes, rule_id, or threat vectors..."
                className="h-11 pl-12 bg-white/[0.03] border-white/[0.05] focus-visible:ring-primary/20 font-medium text-xs rounded-xl transition-all hover:bg-white/[0.05] focus-visible:bg-white/[0.06]"
              />
            </div>

            <div className="flex items-center gap-6 animate-reveal" style={{ animationDelay: '0.2s' }}>
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-3.5 h-3.5 text-primary opacity-80" />
                  <span className="text-[10px] font-bold text-zinc-300 mono-data uppercase tracking-widest">{dateLabel}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 px-2 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Network Synchronized</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-11 w-11 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded-2xl relative border border-white/[0.02]">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-3 right-3 w-2 h-2 bg-accent rounded-full border-2 border-[#020203] shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                </Button>
                
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/[0.06] flex items-center justify-center text-[10px] font-bold shadow-xl">
                   PS
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="flex-1 px-4 sm:px-8 py-6 sm:py-10 max-w-[1720px] mx-auto w-full">
           {children}
        </section>

        <footer className="h-16 px-10 border-t border-white/[0.02] flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
           <div className="flex items-center gap-4">
              <span>© 2026 Sentinal Droid</span>
              <div className="w-1 h-1 rounded-full bg-zinc-800" />
              <span>Cyber-Forensics AI-Pipeline v2.4.1</span>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-primary/60">Ready to Deep Dive</span>
              <div className="w-4 h-[1px] bg-zinc-800" />
              <span>08:38:27+05:30</span>
           </div>
        </footer>
      </main>
    </div>
  )
}
