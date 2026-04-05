import React from "react"
import { motion } from "framer-motion"
import { FileText, AlertTriangle, GitBranch, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"

interface SummaryStatsProps {
  totalFindings: number
  totalChains: number
  riskScore: number
  tokensUsed: number
}

export default function SummaryStats({ totalFindings, totalChains, riskScore, tokensUsed }: SummaryStatsProps) {
  const stats = [
    { label: "Findings", value: totalFindings.toLocaleString(), icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Chains", value: totalChains, icon: GitBranch, color: "text-cyan-300", bg: "bg-cyan-500/10" },
    { label: "Risk", value: `${riskScore}%`, icon: FileText, color: riskScore >= 80 ? "text-red-400" : riskScore >= 50 ? "text-orange-400" : "text-green-400", bg: riskScore >= 80 ? "bg-red-500/10" : riskScore >= 50 ? "bg-orange-500/10" : "bg-green-500/10" },
    { label: "Tokens", value: tokensUsed.toLocaleString(), icon: Cpu, color: "text-blue-400", bg: "bg-blue-500/10" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <span className={cn("text-xl font-bold", stat.color)}>{stat.value}</span>
              </div>
              <div className={cn("w-9 h-9 flex items-center justify-center rounded-md", stat.bg)}>
                <Icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
