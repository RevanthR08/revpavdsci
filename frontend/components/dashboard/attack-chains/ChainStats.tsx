import React, { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import anime from "animejs"
import { GitBranch, Users, Layers, TrendingUp, PlaneTakeoff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChainStatsProps {
  totalChains: number
  avgConfidence: number
  totalUsers: number
  totalPhases: number
  totalTravels?: number
}

function AnimatedValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      anime({
        targets: ref.current,
        innerHTML: [0, value],
        easing: "easeOutExpo",
        round: suffix === "%" ? 1 : 1,
        duration: 1200,
      })
    }
  }, [value, suffix])

  return (
    <span ref={ref} className="text-2xl font-bold text-white">
      0{suffix}
    </span>
  )
}

const baseStats = [
  { key: "chains", label: "Total Chains", icon: GitBranch, color: "text-cyan-300", bg: "bg-cyan-500/15 border-cyan-500/35" },
  { key: "confidence", label: "Avg Confidence", icon: TrendingUp, color: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/35" },
  { key: "users", label: "Users Affected", icon: Users, color: "text-sky-300", bg: "bg-sky-500/15 border-sky-500/35" },
  { key: "phases", label: "Kill Phases", icon: Layers, color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/35" },
]

export default function ChainStats({ totalChains, avgConfidence, totalUsers, totalPhases, totalTravels }: ChainStatsProps) {
  const values: Record<string, number> = {
    chains: totalChains,
    confidence: Math.round(avgConfidence * 100),
    users: totalUsers,
    phases: totalPhases,
    travels: totalTravels || 0,
  }

  const stats = [...baseStats]
  if (totalTravels !== undefined) {
    stats.push({ key: "travels", label: "Travel Anomalies", icon: PlaneTakeoff, color: "text-red-300", bg: "bg-red-500/15 border-red-500/35" })
  }

  return (
    <div className={cn("grid gap-3", stats.length === 5 ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4")}>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="panel-surface rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.16em] mb-1">
                  {stat.label}
                </p>
                <AnimatedValue
                  value={values[stat.key]}
                  suffix={stat.key === "confidence" ? "%" : ""}
                />
              </div>
              <div className={cn("w-9 h-9 flex items-center justify-center rounded-md border", stat.bg)}>
                <Icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
