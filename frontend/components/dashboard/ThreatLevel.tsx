import React, { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import anime from "animejs"
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThreatLevelProps {
  score: number
  threatLevel: string
}

const threatConfig: Record<string, { color: string; card: string; iconBg: string; bar: string; icon: typeof Shield; label: string }> = {
  CRITICAL: {
    color: "text-red-400",
    card: "bg-red-500/10 border-red-500/20",
    iconBg: "bg-red-500/15",
    bar: "bg-gradient-to-r from-red-500 to-orange-500",
    icon: ShieldX,
    label: "Critical Threat Detected",
  },
  HIGH: {
    color: "text-orange-400",
    card: "bg-orange-500/10 border-orange-500/20",
    iconBg: "bg-orange-500/15",
    bar: "bg-gradient-to-r from-orange-500 to-amber-500",
    icon: ShieldAlert,
    label: "High Risk Activity",
  },
  MEDIUM: {
    color: "text-yellow-400",
    card: "bg-yellow-500/10 border-yellow-500/20",
    iconBg: "bg-yellow-500/15",
    bar: "bg-gradient-to-r from-yellow-500 to-lime-500",
    icon: ShieldAlert,
    label: "Medium Risk",
  },
  LOW: {
    color: "text-green-400",
    card: "bg-green-500/10 border-green-500/20",
    iconBg: "bg-green-500/15",
    bar: "bg-gradient-to-r from-emerald-500 to-cyan-500",
    icon: ShieldCheck,
    label: "Low Risk",
  },
}

export default function ThreatLevel({ score, threatLevel }: ThreatLevelProps) {
  const scoreRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const config = threatConfig[threatLevel] || threatConfig.LOW
  const Icon = config.icon

  useEffect(() => {
    if (scoreRef.current) {
      anime({
        targets: scoreRef.current,
        innerHTML: [0, score],
        easing: "easeOutExpo",
        round: 1,
        duration: 2000,
      })
    }
    if (barRef.current) {
      anime({
        targets: barRef.current,
        width: [`${0}%`, `${score}%`],
        easing: "easeOutExpo",
        duration: 2000,
      })
    }
  }, [score])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn("border p-5 rounded-md", config.card)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Threat Level
          </p>
          <p className={cn("text-lg font-bold", config.color)}>{config.label}</p>
        </div>
        <div className={cn("w-12 h-12 flex items-center justify-center rounded-md", config.iconBg)}>
          <Icon className={cn("w-6 h-6", config.color)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span ref={scoreRef} className={cn("text-3xl font-bold", config.color)}>
            0
          </span>
          <span className="text-sm text-zinc-500">/ 100</span>
        </div>

        <div className="h-2 bg-zinc-800 overflow-hidden rounded">
          <div
            ref={barRef}
            className={cn("h-full w-0 rounded", config.bar)}
          />
        </div>
      </div>
    </motion.div>
  )
}
