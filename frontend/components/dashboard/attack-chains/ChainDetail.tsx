import React from "react"
import { motion } from "framer-motion"
import { User, Server, Clock, GitBranch } from "lucide-react"
import AttackTree from "./AttackTree"
import KillChainTimeline from "./KillChainTimeline"
import { cn } from "@/lib/utils"

interface Chain {
  id: string
  chain_index: number
  title: string
  summary?: string
  chain_confidence: number
  kill_chain_phases: string[]
  affected_users: string[]
  affected_hosts: string[]
  session_duration_minutes?: number
  first_event_time?: string
  last_event_time?: string
}

interface ChainDetailProps {
  chain: Chain
  analysisId: string
}

export default function ChainDetail({ chain, analysisId }: ChainDetailProps) {
  const formatTime = (ts?: string) => {
    if (!ts) return ""
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ts
    }
  }

  const attackTreeData = {
    chain: chain.kill_chain_phases,
    confidence: chain.chain_confidence,
    evidence: [],
    kill_chain_phases: chain.kill_chain_phases,
  }

  return (
    <motion.div
      key={chain.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="panel-surface rounded-2xl h-full flex flex-col overflow-hidden"
    >
      <div className="p-5 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-300" />
            <h3 className="text-base font-semibold text-white">Chain {chain.chain_index}</h3>
          </div>
          <span
            className={cn(
              "text-sm font-semibold px-3 py-1 rounded-full border",
              chain.chain_confidence >= 0.8 ? "text-red-400 bg-red-500/10" :
              chain.chain_confidence >= 0.5 ? "text-orange-400 bg-orange-500/10" :
              "text-yellow-400 bg-yellow-500/10"
            )}
          >
            {Math.round(chain.chain_confidence * 100)}%
          </span>
        </div>
        <p className="text-sm text-zinc-400">{chain.title}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
        {chain.summary && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical]">
              {chain.summary}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Users</p>
            <div className="space-y-1.5">
              {chain.affected_users.slice(0, 4).map((user) => (
                <div
                  key={user}
                  className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900/70 border border-zinc-800 rounded-md"
                >
                  <User className="w-4 h-4 text-sky-300" />
                  <span className="text-sm text-zinc-200">{user}</span>
                </div>
              ))}
              {chain.affected_users.length > 4 && (
                <span className="text-xs text-zinc-500">+{chain.affected_users.length - 4} more</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Hosts</p>
            <div className="space-y-1.5">
              {chain.affected_hosts.slice(0, 4).map((host) => (
                <div
                  key={host}
                  className="flex items-center gap-2.5 px-3 py-2 bg-zinc-900/70 border border-zinc-800 rounded-md"
                >
                  <Server className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm text-zinc-200">{host}</span>
                </div>
              ))}
              {chain.affected_hosts.length > 4 && (
                <span className="text-xs text-zinc-500">+{chain.affected_hosts.length - 4} more</span>
              )}
            </div>
          </div>
        </div>

        {/* Kill Chain Timeline */}
        <KillChainTimeline phases={chain.kill_chain_phases} />

        <div className="panel-muted rounded-xl p-5">
          <AttackTree chain={attackTreeData} />
        </div>

        {chain.first_event_time && chain.last_event_time && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Timeline</p>
            <div className="flex items-center gap-4 bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Clock className="w-4 h-4 text-zinc-500" />
                {formatTime(chain.first_event_time)}
              </div>
              <div className="flex-1 h-px bg-zinc-700" />
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Clock className="w-4 h-4 text-zinc-500" />
                {formatTime(chain.last_event_time)}
              </div>
            </div>
            {chain.session_duration_minutes && (
              <p className="text-xs text-zinc-500 mt-2">
                Duration: {chain.session_duration_minutes} minutes
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
