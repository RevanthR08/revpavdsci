import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface FindingRow {
  severity: string
  title: string
  type: string
  count: number
  mitre: string[]
}

interface FindingsSummaryTableProps {
  findings: FindingRow[]
}

const typeLabels: Record<string, string> = {
  rule: "Rule",
  ml_anomaly: "ML",
  impossible_travel: "Travel",
  priv_esc: "Priv Esc",
  persistence: "Persistence",
  lateral: "Lateral",
}

const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10",
  high: "text-orange-400 bg-orange-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  low: "text-blue-400 bg-blue-500/10",
}

export default function FindingsSummaryTable({ findings }: FindingsSummaryTableProps) {
  const uniqueFindings: Record<string, FindingRow> = {}
  findings.forEach(f => {
    const key = `${f.severity}-${f.title}`
    if (!uniqueFindings[key]) {
      uniqueFindings[key] = { ...f }
    } else {
      uniqueFindings[key].count += f.count
    }
  })

  const rows = Object.values(uniqueFindings).slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-zinc-900 border border-zinc-800 rounded-md"
    >
      <div className="p-4 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Findings</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Severity</th>
            <th className="text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Finding</th>
            <th className="text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Type</th>
            <th className="text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Count</th>
            <th className="text-left text-[9px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">MITRE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.3 + index * 0.03 }}
              className="border-b border-zinc-800/50"
            >
              <td className="px-4 py-2">
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 uppercase rounded-[3px]", severityColors[row.severity] || "text-zinc-400 bg-zinc-800")}>
                  {row.severity}
                </span>
              </td>
              <td className="px-4 py-2">
                <span className="text-xs text-zinc-300 truncate block max-w-[180px]">{row.title}</span>
              </td>
              <td className="px-4 py-2">
                <span className="text-[10px] text-zinc-500">{typeLabels[row.type] || row.type}</span>
              </td>
              <td className="px-4 py-2">
                <span className="text-xs text-zinc-400 font-mono">{row.count}</span>
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  {row.mitre.slice(0, 2).map(t => (
                    <span key={t} className="text-[8px] text-zinc-500 bg-zinc-800 px-1 py-0.5 rounded-[2px]">{t}</span>
                  ))}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}
