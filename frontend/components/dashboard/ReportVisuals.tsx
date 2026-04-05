import React from "react"
import { motion } from "framer-motion"
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts"
import { User, Server, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReportVisualsProps {
  findings: any[]
  chains: any[]
  analysis: any
}

const SEVERITY_COLORS = ["#DC2626", "#D97706", "#CA8A04", "#0284C7", "#6B7280"]
const SEVERITY_DOT_CLASSES = ["bg-red-600", "bg-orange-600", "bg-yellow-600", "bg-sky-600", "bg-zinc-500"]

const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
  info: "bg-zinc-500 text-white",
}

function getPhaseBadgeClass(phase: string): string {
  const value = phase.toLowerCase()

  if (value.includes("credential")) return "bg-red-600"
  if (value.includes("initial")) return "bg-orange-600"
  if (value.includes("execution")) return "bg-yellow-600"
  if (value.includes("privilege")) return "bg-violet-600"
  if (value.includes("persistence")) return "bg-pink-600"
  if (value.includes("lateral")) return "bg-sky-600"
  if (value.includes("defense")) return "bg-indigo-600"

  return "bg-zinc-500"
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 px-3 py-2 rounded">
        <p className="text-xs text-zinc-300">{payload[0].name}: {payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function ReportVisuals({ findings, chains, analysis }: ReportVisualsProps) {
  const severityData = [
    { name: "Critical", value: findings.filter(f => f.severity === "critical").length },
    { name: "High", value: findings.filter(f => f.severity === "high").length },
    { name: "Medium", value: findings.filter(f => f.severity === "medium").length },
    { name: "Low", value: findings.filter(f => f.severity === "low").length },
    { name: "Info", value: findings.filter(f => f.severity === "info").length },
  ].filter(d => d.value > 0)

  const typeData = [
    { name: "Rule", value: findings.filter(f => f.detection_type === "rule").length },
    { name: "ML", value: findings.filter(f => f.detection_type === "ml_anomaly").length },
    { name: "Travel", value: findings.filter(f => f.detection_type === "impossible_travel").length },
  ].filter(d => d.value > 0)

  const topFindings = findings.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Severity Pie */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-md"
        >
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Severity Breakdown</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                {severityData.map((_, i) => <Cell key={i} fill={SEVERITY_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {severityData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-[2px]", SEVERITY_DOT_CLASSES[i] || "bg-zinc-500")} />
                <span className="text-[9px] text-zinc-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Type Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-md"
        >
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Detection Types</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={typeData}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top Findings Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-zinc-800/50 border border-zinc-700/50 rounded-md"
      >
        <div className="p-3 border-b border-zinc-700/50">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Top Findings</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700/50">
              <th className="text-left text-[9px] font-medium text-zinc-500 uppercase px-3 py-2">Severity</th>
              <th className="text-left text-[9px] font-medium text-zinc-500 uppercase px-3 py-2">Finding</th>
              <th className="text-left text-[9px] font-medium text-zinc-500 uppercase px-3 py-2">User</th>
              <th className="text-left text-[9px] font-medium text-zinc-500 uppercase px-3 py-2">MITRE</th>
            </tr>
          </thead>
          <tbody>
            {topFindings.map((f, i) => (
              <tr key={i} className="border-b border-zinc-700/30">
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-[3px]",
                      SEVERITY_BADGE_CLASSES[f.severity] || SEVERITY_BADGE_CLASSES.info
                    )}
                  >
                    {f.severity?.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-300 truncate max-w-[200px]">{f.title}</td>
                <td className="px-3 py-2 text-xs text-zinc-400">{f.affected_users?.[0] || "-"}</td>
                <td className="px-3 py-2">
                  <span className="text-[9px] text-zinc-500 bg-zinc-700 px-1 py-0.5 rounded-[2px]">
                    {f.mitre_techniques?.[0] || "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Attack Chain Flow */}
      {chains.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-md"
        >
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Attack Chain Flow</p>
          {chains.slice(0, 2).map((chain, ci) => (
            <div key={ci} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-white">{chain.affected_users?.[0] || "Unknown"}</span>
                <span className="text-[9px] text-zinc-500">({Math.round(chain.chain_confidence * 100)}%)</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {chain.kill_chain_phases?.map((phase: string, i: number) => (
                  <React.Fragment key={i}>
                    <span
                      className={cn("text-[9px] font-semibold px-2 py-1 text-white rounded", getPhaseBadgeClass(phase))}
                    >
                      {phase.replace(/-/g, " ")}
                    </span>
                    {i < chain.kill_chain_phases.length - 1 && (
                      <span className="text-zinc-600 text-[10px]">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Affected Assets Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zinc-800/50 border border-zinc-700/50 rounded-md"
      >
        <div className="p-3 border-b border-zinc-700/50">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Affected Assets</p>
        </div>
        <div className="grid grid-cols-3 gap-4 p-4">
          <div>
            <p className="text-[9px] text-zinc-500 uppercase mb-2">Users</p>
            {[...new Set(findings.flatMap(f => f.affected_users || []))].slice(0, 5).map((u: any) => (
              <div key={u} className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-zinc-300">{u}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase mb-2">Hosts</p>
            {[...new Set(findings.flatMap(f => f.affected_hosts || []))].slice(0, 5).map((h: any) => (
              <div key={h} className="flex items-center gap-2 mb-1">
                <Server className="w-3 h-3 text-green-400" />
                <span className="text-xs text-zinc-300">{h}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase mb-2">IPs</p>
            {[...new Set(findings.flatMap(f => f.source_ips || []))].slice(0, 5).map((ip: any) => (
              <div key={ip} className="flex items-center gap-2 mb-1">
                <Globe className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-zinc-300">{ip}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
