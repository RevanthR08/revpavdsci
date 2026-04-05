import React, { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import anime from "animejs"
import { AlertTriangle, AlertCircle, Info, Shield, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SeverityStatsProps {
  stats: Record<string, number>
}

const severityConfig: Record<string, { color: string; card: string; iconBg: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: "text-red-400", card: "bg-red-500/10 border-red-500/30", iconBg: "bg-red-500/15", icon: XCircle, label: "Critical" },
  high: { color: "text-orange-400", card: "bg-orange-500/10 border-orange-500/30", iconBg: "bg-orange-500/15", icon: AlertTriangle, label: "High" },
  medium: { color: "text-yellow-400", card: "bg-yellow-500/10 border-yellow-500/30", iconBg: "bg-yellow-500/15", icon: AlertCircle, label: "Medium" },
  low: { color: "text-blue-400", card: "bg-blue-500/10 border-blue-500/30", iconBg: "bg-blue-500/15", icon: Info, label: "Low" },
  info: { color: "text-zinc-400", card: "bg-zinc-500/10 border-zinc-500/30", iconBg: "bg-zinc-500/15", icon: Shield, label: "Info" },
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      anime({
        targets: ref.current,
        innerHTML: [0, value],
        easing: "easeOutExpo",
        round: 1,
        duration: 1200,
      })
    }
  }, [value])

  return (
    <span ref={ref} className={cn("text-xl font-bold", className)}>
      0
    </span>
  )
}

export default function SeverityStats({ stats }: SeverityStatsProps) {
  const severities = ["critical", "high", "medium", "low", "info"]

  return (
    <div className="flex gap-3">
      {severities.map((sev, index) => {
        const config = severityConfig[sev]
        const count = stats[sev] || 0
        const Icon = config.icon

        return (
          <motion.div
            key={sev}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn("flex-1 border p-3 cursor-pointer transition-all duration-150 hover:opacity-90 rounded-md", config.card)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-[10px] font-medium uppercase tracking-wider mb-1", config.color)}>
                  {config.label}
                </p>
                <AnimatedCounter value={count} className={config.color} />
              </div>
              <div className={cn("w-8 h-8 flex items-center justify-center rounded", config.iconBg)}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
