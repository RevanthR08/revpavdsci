import React from "react"
import { motion } from "framer-motion"
import { User, Server, Globe, Cpu, ChevronRight, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface GraphNode {
  id: string
  type: string
  label: string
}

interface GraphEdge {
  source: string
  target: string
  label?: string
  technique?: string
}

interface ChainGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const nodeStyles: Record<string, { icon: typeof User; bg: string; border: string; text: string }> = {
  user: { icon: User, bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
  host: { icon: Server, bg: "bg-green-500/15", border: "border-green-500/30", text: "text-green-400" },
  ip: { icon: Globe, bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400" },
  service: { icon: Zap, bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300" },
  process: { icon: Cpu, bg: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-400" },
}

export default function ChainGraph({ nodes, edges }: ChainGraphProps) {
  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No graph data available
      </div>
    )
  }

  const userNodes = nodes.filter(n => n.type === "user")
  const actionNodes = nodes.filter(n => n.type === "service")
  const targetNodes = nodes.filter(n => ["host", "ip"].includes(n.type))

  return (
    <div className="space-y-5">
      {/* Attacker */}
      {userNodes.map((node, i) => {
        const style = nodeStyles[node.type]
        const Icon = style.icon
        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div
              className={cn("w-11 h-11 border flex items-center justify-center rounded-md", style.bg, style.border)}
            >
              <Icon className={cn("w-5 h-5", style.text)} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{node.label}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Attacker</p>
            </div>
          </motion.div>
        )
      })}

      {/* Arrow down */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex items-center gap-2 pl-5 origin-top"
      >
        <div className="w-px h-6 bg-zinc-600" />
        <ChevronRight className="w-3 h-3 text-zinc-600 -rotate-90" />
      </motion.div>

      {/* Attack Steps */}
      <div className="pl-5">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Attack Steps</p>
        <div className="flex items-center flex-wrap gap-1">
          {actionNodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
              >
                <span className="text-xs font-medium px-2.5 py-1.5 bg-zinc-800 text-zinc-200 border border-zinc-700 inline-block rounded">
                  {node.label}
                </span>
              </motion.div>
              {i < actionNodes.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Arrow down */}
      {targetNodes.length > 0 && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="flex items-center gap-2 pl-5 origin-top"
        >
          <div className="w-px h-6 bg-zinc-600" />
          <ChevronRight className="w-3 h-3 text-zinc-600 -rotate-90" />
        </motion.div>
      )}

      {/* Target Hosts */}
      {targetNodes.length > 0 && (
        <div className="pl-5">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Targeted Systems</p>
          <div className="flex flex-wrap gap-2">
            {targetNodes.map((node, i) => {
              const style = nodeStyles[node.type] || nodeStyles.host
              const Icon = style.icon
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
                  className={cn("flex items-center gap-2 px-3 py-2 border rounded-md", style.bg, style.border)}
                >
                  <Icon className={cn("w-4 h-4", style.text)} />
                  <span className="text-sm text-zinc-200">{node.label}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
