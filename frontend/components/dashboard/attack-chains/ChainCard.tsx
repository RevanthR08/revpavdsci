import React from "react"
import { motion } from "framer-motion"
import { User, ChevronRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Chain {
  id: string
  chain_index: number
  title: string
  chain_confidence: number
  kill_chain_phases: string[]
  affected_users: string[]
  affected_hosts: string[]
  session_duration_minutes?: number
}

interface ChainCardProps {
  chain: Chain
  selected: boolean
  onClick: () => void
  index: number
}

const phaseColors: Record<string, string> = {
  "credential-access": "bg-red-500/20 text-red-300 border-red-500/35",
  "initial-access": "bg-orange-500/20 text-orange-300 border-orange-500/35",
  "execution": "bg-amber-500/20 text-amber-300 border-amber-500/35",
  "privilege-escalation": "bg-violet-500/20 text-violet-300 border-violet-500/35",
  "persistence": "bg-pink-500/20 text-pink-300 border-pink-500/35",
  "defense-evasion": "bg-indigo-500/20 text-indigo-300 border-indigo-500/35",
  "lateral-movement": "bg-cyan-500/20 text-cyan-300 border-cyan-500/35",
  "discovery": "bg-sky-500/20 text-sky-300 border-sky-500/35",
  "collection": "bg-teal-500/20 text-teal-300 border-teal-500/35",
  "command-and-control": "bg-green-500/20 text-green-300 border-green-500/35",
  "exfiltration": "bg-emerald-500/20 text-emerald-300 border-emerald-500/35",
  "impact": "bg-rose-500/20 text-rose-300 border-rose-500/35",
}

export default function ChainCard({ chain, selected, onClick, index }: ChainCardProps) {
  const confidenceColor =
    chain.chain_confidence >= 0.8 ? "text-red-400 bg-red-500/10" :
    chain.chain_confidence >= 0.5 ? "text-orange-400 bg-orange-500/10" :
    "text-yellow-400 bg-yellow-500/10"

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all duration-150 rounded-xl border panel-muted",
        selected
          ? "border-cyan-500/45 bg-cyan-500/10"
          : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-zinc-500" />
          <span className="text-base font-semibold text-white">
            {chain.affected_users[0] || "Unknown"}
          </span>
          {chain.affected_users.length > 1 && (
            <span className="text-xs text-zinc-500">+{chain.affected_users.length - 1} more</span>
          )}
        </div>
        <span className={cn("text-sm font-bold px-2.5 py-1 rounded-full border", confidenceColor, "border-current/40") }>
          {Math.round(chain.chain_confidence * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {chain.kill_chain_phases.slice(0, 3).map((phase, i) => (
          <React.Fragment key={phase}>
            <span
              className={cn(
                "text-[11px] font-semibold px-2 py-1 capitalize border rounded",
                phaseColors[phase] || "bg-zinc-700/40 text-zinc-300 border-zinc-600"
              )}
            >
              {phase.replace("-", " ")}
            </span>
            {i < Math.min(chain.kill_chain_phases.length, 3) - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            )}
          </React.Fragment>
        ))}
        {chain.kill_chain_phases.length > 3 && (
          <span className="text-[11px] text-zinc-500 font-medium">+{chain.kill_chain_phases.length - 3}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>{chain.affected_hosts.length} host{chain.affected_hosts.length !== 1 ? "s" : ""}</span>
        {chain.session_duration_minutes && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {chain.session_duration_minutes}m
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 bg-zinc-900 border border-zinc-800 overflow-hidden rounded">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${chain.chain_confidence * 100}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
          className={cn(
            "h-full rounded",
            chain.chain_confidence >= 0.8 ? "bg-red-500" :
            chain.chain_confidence >= 0.5 ? "bg-orange-500" : "bg-yellow-500"
          )}
        />
      </div>
    </motion.div>
  )
}
