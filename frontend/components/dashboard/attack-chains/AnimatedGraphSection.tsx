import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Network, RotateCcw, Wifi, Activity } from "lucide-react"
import AnimatedAttackGraph from "./AnimatedAttackGraph"

interface AnimatedGraphSectionProps {
  analysisId: string
  selectedChain: any | null
}

interface GraphNode {
  id: string
  type: string
  label: string
  x: number
  y: number
  sublabel?: string
}

interface GraphEdge {
  source: string
  target: string
  label?: string
  technique?: string
  severity?: "critical" | "high" | "medium"
}

// Maps kill-chain phase names → MITRE techniques for edge labels
const PHASE_TO_TECHNIQUE: Record<string, string> = {
  "credential-access":     "T1110.001",
  "initial-access":        "T1078",
  "execution":             "T1059.001",
  "privilege-escalation":  "T1548.002",
  "persistence":           "T1053.005",
  "defense-evasion":       "T1070.004",
  "lateral-movement":      "T1021.002",
  "discovery":             "T1082",
  "collection":            "T1005",
  "command-and-control":   "T1071.001",
  "exfiltration":          "T1041",
  "impact":                "T1486",
}

// Maps phase to severity for edge coloring
const PHASE_SEVERITY: Record<string, "critical" | "high" | "medium"> = {
  "impact":               "critical",
  "exfiltration":         "critical",
  "privilege-escalation": "critical",
  "lateral-movement":     "high",
  "credential-access":    "high",
  "persistence":          "high",
  "initial-access":       "medium",
  "execution":            "medium",
  "discovery":            "medium",
  "defense-evasion":      "medium",
  "collection":           "medium",
}

// Maps phase index to a node type
const PHASE_NODE_TYPE: Record<string, string> = {
  "initial-access":        "attacker",
  "credential-access":     "attacker",
  "execution":             "service",
  "privilege-escalation":  "service",
  "persistence":           "service",
  "defense-evasion":       "service",
  "lateral-movement":      "host",
  "discovery":             "user",
  "collection":            "host",
  "command-and-control":   "dc",
  "exfiltration":          "target",
  "impact":                "target",
}

function buildGraph(chain: any): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const phases: string[] = chain.kill_chain_phases || []
  const hosts: string[] = chain.affected_hosts || ["HOST-01"]
  const users: string[] = chain.affected_users || ["CORP\\admin"]

  if (!phases.length) return { nodes: [], edges: [] }

  const count = phases.length
  // Layout: evenly spaced horizontally, with slight vertical offset for zigzag
  const W = 900
  const padding = 80
  const spacing = (W - padding * 2) / Math.max(count - 1, 1)

  const nodes: GraphNode[] = phases.map((phase, i) => {
    const zigzag = count > 3 ? (i % 2 === 0 ? 130 : 200) : 165
    const type = PHASE_NODE_TYPE[phase] || "service"
    const hostLabel = hosts[i % hosts.length] || "HOST"
    const userLabel = users[i % users.length] || "admin"

    let label = phase.replace(/-/g, " ")
    let sublabel = type === "attacker" ? userLabel : hostLabel

    return {
      id: `node-${i}`,
      type,
      label: label.split(" ").map((w: string) => w[0].toUpperCase() + w.slice(1)).join(" "),
      sublabel,
      x: padding + i * spacing,
      y: zigzag,
    }
  })

  const edges: GraphEdge[] = phases.slice(0, -1).map((phase, i) => ({
    source: `node-${i}`,
    target: `node-${i + 1}`,
    technique: PHASE_TO_TECHNIQUE[phases[i + 1]] || PHASE_TO_TECHNIQUE[phase],
    severity: PHASE_SEVERITY[phases[i + 1]] || "high",
  }))

  return { nodes, edges }
}

const LEGEND_ITEMS = [
  { dotClass: "bg-red-400", label: "Attacker / Source" },
  { dotClass: "bg-sky-400", label: "User account" },
  { dotClass: "bg-emerald-400", label: "Host / Server" },
  { dotClass: "bg-violet-400", label: "Domain Controller" },
  { dotClass: "bg-orange-400", label: "Impact / Target" },
]

const SEVERITY_EDGES = [
  { lineClass: "bg-red-400", label: "Critical" },
  { lineClass: "bg-orange-400", label: "High" },
  { lineClass: "bg-amber-400", label: "Medium" },
]

export default function AnimatedGraphSection({ analysisId, selectedChain }: AnimatedGraphSectionProps) {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [isPlaying, setIsPlaying] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (selectedChain) {
      const built = buildGraph(selectedChain)
      setGraph(built)
      setKey(prev => prev + 1)
      setIsPlaying(true)
    }
  }, [selectedChain])

  const handleReplay = () => {
    setKey(prev => prev + 1)
    setIsPlaying(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="panel-surface rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/90 bg-zinc-950/70">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-md bg-cyan-500/15 border border-cyan-500/30">
            <Network className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Live Attack Graph</h3>
            <p className="text-[10px] text-zinc-500">Real-time threat propagation visualization</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-300">Live</span>
          </div>

          {selectedChain && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 max-w-[200px] rounded border border-zinc-700 bg-zinc-900">
              <Activity className="w-3 h-3 flex-shrink-0 text-orange-300" />
              <span className="text-[10px] truncate text-zinc-300">Chain #{selectedChain.chain_index}</span>
            </div>
          )}

          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 text-xs transition-all duration-150 rounded border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>
        </div>
      </div>

      <div className="relative min-h-[320px] bg-zinc-950">
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-500/20 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-500/20 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-500/20 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-500/20 rounded-br-xl" />

        <AnimatePresence mode="wait">
          {graph.nodes.length > 0 ? (
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 pt-6 pb-2"
            >
              <AnimatedAttackGraph
                nodes={graph.nodes}
                edges={graph.edges}
                isPlaying={isPlaying}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 gap-3"
            >
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                  <Network className="w-10 h-10 text-zinc-600" />
              </motion.div>
                <p className="text-sm text-zinc-600">Select a chain to visualize the attack path</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 border-t border-zinc-800/90 bg-zinc-950/70">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Node Types</span>
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.dotClass}`} />
              <span className="text-[10px] text-zinc-500">{item.label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Edge Severity</span>
          {SEVERITY_EDGES.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-6 h-0.5 ${item.lineClass}`} />
                <span className="text-[10px] text-zinc-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
