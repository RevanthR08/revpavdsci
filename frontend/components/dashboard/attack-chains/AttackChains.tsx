import React from "react"
import { motion } from "framer-motion"
import { ChevronRight, GitBranch, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Chain {
  id: string
  chain_index: number
  title: string
  chain_confidence: number
  kill_chain_phases: string[]
  affected_users: string[]
  affected_hosts: string[]
}

interface AttackChainsProps {
  chains: Chain[]
  onViewAll?: () => void
}

const phaseTone: Record<string, string> = {
  "credential-access": "bg-red-500/20 text-red-300 border-red-500/35",
  "initial-access": "bg-orange-500/20 text-orange-300 border-orange-500/35",
  execution: "bg-amber-500/20 text-amber-300 border-amber-500/35",
  "privilege-escalation": "bg-indigo-500/20 text-indigo-300 border-indigo-500/35",
  persistence: "bg-pink-500/20 text-pink-300 border-pink-500/35",
  "defense-evasion": "bg-indigo-500/20 text-indigo-300 border-indigo-500/35",
  "lateral-movement": "bg-cyan-500/20 text-cyan-300 border-cyan-500/35",
  discovery: "bg-sky-500/20 text-sky-300 border-sky-500/35",
  collection: "bg-teal-500/20 text-teal-300 border-teal-500/35",
  "command-and-control": "bg-green-500/20 text-green-300 border-green-500/35",
  exfiltration: "bg-emerald-500/20 text-emerald-300 border-emerald-500/35",
  impact: "bg-rose-500/20 text-rose-300 border-rose-500/35",
}

function prettifyPhase(phase: string) {
  return phase.replace(/-/g, " ")
}

export default function AttackChains({ chains, onViewAll }: AttackChainsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="panel-surface rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-300" />
          <h3 className="text-sm font-semibold text-zinc-100">Attack Chains</h3>
          <span className="metric-chip">{chains.length}</span>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-zinc-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {chains.slice(0, 3).map((chain, index) => (
          <motion.div
            key={chain.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/45 p-4 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-zinc-500" />
                <p className="text-sm text-zinc-200 truncate">{chain.affected_users[0] || chain.affected_hosts[0] || "Unknown actor"}</p>
              </div>
              <span className={cn(
                "text-[11px] rounded-full px-2 py-1 border mono-data",
                chain.chain_confidence >= 0.8
                  ? "bg-red-500/15 border-red-500/35 text-red-300"
                  : chain.chain_confidence >= 0.5
                    ? "bg-orange-500/15 border-orange-500/35 text-orange-300"
                    : "bg-cyan-500/15 border-cyan-500/35 text-cyan-300"
              )}>
                {Math.round(chain.chain_confidence * 100)}%
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(chain.kill_chain_phases || []).slice(0, 5).map((phase, phaseIndex, list) => (
                <React.Fragment key={`${chain.id}-${phase}`}>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-[10px] capitalize",
                      phaseTone[phase] || "bg-zinc-800 border-zinc-700 text-zinc-300"
                    )}
                  >
                    {prettifyPhase(phase)}
                  </span>
                  {phaseIndex < list.length - 1 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
                </React.Fragment>
              ))}
            </div>

            <p className="text-xs text-zinc-500 mt-2 truncate">{chain.title}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
