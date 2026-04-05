import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface KillChainTimelineProps {
  phases: string[]
}

const phaseOrder = [
  "initial-access",
  "execution",
  "credential-access",
  "privilege-escalation",
  "defense-evasion",
  "persistence",
  "lateral-movement",
  "discovery",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
]

const phaseColors: Record<string, string> = {
  "initial-access": "bg-orange-500/25 text-orange-200 border-orange-500/40",
  "execution": "bg-amber-500/25 text-amber-200 border-amber-500/40",
  "credential-access": "bg-red-500/25 text-red-200 border-red-500/40",
  "privilege-escalation": "bg-violet-500/25 text-violet-200 border-violet-500/40",
  "defense-evasion": "bg-indigo-500/25 text-indigo-200 border-indigo-500/40",
  "persistence": "bg-pink-500/25 text-pink-200 border-pink-500/40",
  "lateral-movement": "bg-cyan-500/25 text-cyan-200 border-cyan-500/40",
  "discovery": "bg-sky-500/25 text-sky-200 border-sky-500/40",
  "collection": "bg-teal-500/25 text-teal-200 border-teal-500/40",
  "command-and-control": "bg-green-500/25 text-green-200 border-green-500/40",
  "exfiltration": "bg-emerald-500/25 text-emerald-200 border-emerald-500/40",
  "impact": "bg-rose-500/25 text-rose-200 border-rose-500/40",
}

export default function KillChainTimeline({ phases }: KillChainTimelineProps) {
  const sortedPhases = phaseOrder.filter(p => phases.includes(p))

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Kill Chain Progression
      </p>

      {/* Visual Bar */}
      <div className="flex gap-1.5">
        {sortedPhases.map((phase, index) => (
          <motion.div
            key={phase}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className={cn(
              "flex-1 h-10 flex items-center justify-center origin-left border rounded",
              phaseColors[phase] || "bg-zinc-700/30 text-zinc-300 border-zinc-600"
            )}
          >
            <span className="text-[10px] font-semibold capitalize truncate px-1">
              {phase.split("-")[0]}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Full phase names */}
      <div className="flex gap-1.5">
        {sortedPhases.map((phase) => (
          <div key={phase} className="flex-1 text-center">
            <span className="text-[10px] text-zinc-500 capitalize leading-tight block">
              {phase.replace(/-/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
