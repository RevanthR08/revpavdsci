import React from "react"
import { motion } from "framer-motion"
import { LucideIcon, Search, ShieldCheck, AlertTriangle } from "lucide-react"

interface EmptyStateProps {
  type?: "no-findings" | "no-results" | "error"
  title?: string
  description?: string
}

const configs: Record<string, { icon: LucideIcon; color: string; title: string; description: string }> = {
  "no-findings": {
    icon: ShieldCheck,
    color: "text-emerald-300",
    title: "No High-Risk Threats",
    description: "Analysis finished with no elevated threat signals in this view.",
  },
  "no-results": {
    icon: Search,
    color: "text-zinc-400",
    title: "No Results Found",
    description: "Try adjusting your filters to see more findings.",
  },
  error: {
    icon: AlertTriangle,
    color: "text-red-300",
    title: "Unable to Load Findings",
    description: "There was an error loading the findings. Please try again.",
  },
}

export default function EmptyState({ type = "no-findings", title, description }: EmptyStateProps) {
  const config = configs[type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 panel-surface rounded-2xl"
    >
      <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon className={`w-8 h-8 ${config.color}`} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-zinc-400 max-w-sm text-center">
        {description || config.description}
      </p>
    </motion.div>
  )
}
