import React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Finding {
  id: string
  severity: string
  title: string
  detection_type: string
  rule_id?: string
  mitre_techniques?: string[]
  affected_users?: string[]
}

interface FindingsTableProps {
  findings: Finding[]
  onViewAll?: () => void
}

const severityTone: Record<string, string> = {
  critical: "bg-red-500/15 border-red-500/35 text-red-300",
  high: "bg-orange-500/15 border-orange-500/35 text-orange-300",
  medium: "bg-amber-500/15 border-amber-500/35 text-amber-300",
  low: "bg-cyan-500/15 border-cyan-500/35 text-cyan-300",
  info: "bg-zinc-500/15 border-zinc-500/35 text-zinc-300",
}

const detectionLabel: Record<string, string> = {
  rule: "Rule",
  ml_anomaly: "ML",
  impossible_travel: "Travel",
  priv_esc: "Priv Esc",
  persistence: "Persistence",
  lateral: "Lateral",
}

export default function FindingsTable({ findings, onViewAll }: FindingsTableProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="panel-surface rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-300" />
          <h3 className="text-sm font-semibold text-zinc-100">Recent Findings</h3>
          <span className="metric-chip">{findings.length}</span>
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-zinc-800/70 bg-zinc-950/35">
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Severity</th>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Finding</th>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Type</th>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500">MITRE</th>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500">User</th>
            </tr>
          </thead>
          <tbody>
            {findings.slice(0, 10).map((finding, index) => (
              <motion.tr
                key={finding.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/60"
              >
                <td className="px-5 py-3">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase", severityTone[finding.severity] || severityTone.info)}>
                    {finding.severity}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <p className="text-sm text-zinc-200 max-w-[260px] truncate">{finding.title}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-zinc-400">{detectionLabel[finding.detection_type] || finding.detection_type}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(finding.mitre_techniques || []).slice(0, 2).map((technique) => (
                      <span key={technique} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 mono-data">
                        {technique}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-zinc-400">{(finding.affected_users || []).slice(0, 2).join(", ") || "-"}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  )
}
