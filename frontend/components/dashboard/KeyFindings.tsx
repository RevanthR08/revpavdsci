import React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, User, Server } from "lucide-react"
import { cn } from "@/lib/utils"

interface KeyFindingsProps {
  findings: { severity: string; title: string; count?: number }[]
  affectedUsers: string[]
  affectedHosts: string[]
}

const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
}

export default function KeyFindings({ findings, affectedUsers, affectedHosts }: KeyFindingsProps) {
  return (
    <div className="space-y-6">
      {/* Key Findings */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-zinc-900 border border-zinc-800 rounded-md"
      >
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Key Findings</h3>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {findings.slice(0, 6).map((finding, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded"
            >
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 border rounded-[3px]", severityColors[finding.severity] || severityColors.low)}>
                  {finding.severity.toUpperCase()}
                </span>
                <span className="text-xs text-zinc-300 truncate max-w-[140px]">{finding.title}</span>
              </div>
              {finding.count && (
                <span className="text-[10px] text-zinc-500 font-mono">{finding.count}x</span>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Affected Assets */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-zinc-900 border border-zinc-800 rounded-md"
      >
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Affected Assets</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Users</p>
            <div className="flex flex-wrap gap-1">
              {affectedUsers.slice(0, 6).map((user) => (
                <span key={user} className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-[3px]">
                  <User className="w-2.5 h-2.5" />
                  {user}
                </span>
              ))}
              {affectedUsers.length > 6 && (
                <span className="text-[10px] text-zinc-500">+{affectedUsers.length - 6}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Hosts</p>
            <div className="flex flex-wrap gap-1">
              {affectedHosts.slice(0, 6).map((host) => (
                <span key={host} className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-[3px]">
                  <Server className="w-2.5 h-2.5" />
                  {host}
                </span>
              ))}
              {affectedHosts.length > 6 && (
                <span className="text-[10px] text-zinc-500">+{affectedHosts.length - 6}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
