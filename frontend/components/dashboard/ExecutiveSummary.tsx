import React from "react"
import { motion } from "framer-motion"
import { Shield, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExecutiveSummaryProps {
  summary: string
  threatLevel: string
}

export default function ExecutiveSummary({ summary, threatLevel }: ExecutiveSummaryProps) {
  const colors = threatLevel === "CRITICAL"
    ? { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: AlertTriangle }
    : threatLevel === "HIGH"
    ? { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", icon: AlertTriangle }
    : { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", icon: Shield }

  const Icon = colors.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("border p-5 rounded-md", colors.bg, colors.border)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center flex-shrink-0 rounded-md">
          <Icon className={cn("w-5 h-5", colors.text)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Executive Summary</p>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", colors.bg, colors.text)}>
              {threatLevel}
            </span>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical] overflow-hidden">
            {summary}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
