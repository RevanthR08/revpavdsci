import React from "react"
import { motion } from "framer-motion"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3, PieChart as PieIcon, Waves } from "lucide-react"

interface ChartsProps {
  severityData: { name: string; value: number; color: string }[]
  typeData: { name: string; value: number }[]
  timelineData?: { time: string; count: number }[]
}

const TYPE_COLORS = ["#22d3ee", "#f97316", "#a78bfa", "#34d399", "#f43f5e"]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-100 mt-0.5 mono-data">{payload[0].value}</p>
    </div>
  )
}

export default function Charts({ severityData, typeData, timelineData }: ChartsProps) {
  const safeSeverity = severityData.length > 0 ? severityData : [{ name: "None", value: 0, color: "#52525b" }]
  const safeType = typeData.length > 0 ? typeData : [{ name: "None", value: 0 }]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="panel-surface rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-cyan-300" />
          <h3 className="text-sm font-semibold text-zinc-100">Findings by Severity</h3>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={safeSeverity}>
            <CartesianGrid stroke="#27272a" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {safeSeverity.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="panel-surface rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-4 h-4 text-orange-300" />
          <h3 className="text-sm font-semibold text-zinc-100">Detection Types</h3>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={safeType} innerRadius={52} outerRadius={86} dataKey="value" stroke="none" paddingAngle={2}>
              {safeType.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {safeType.map((entry, index) => (
            <span key={`${entry.name}-${index}`} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[10px] text-zinc-300">
              {entry.name}: {entry.value}
            </span>
          ))}
        </div>
      </motion.section>

      {timelineData && timelineData.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="panel-surface rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <Waves className="w-4 h-4 text-emerald-300" />
            <h3 className="text-sm font-semibold text-zinc-100">Activity Timeline</h3>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#22d3ee" fill="url(#timelineGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.section>
      )}
    </div>
  )
}
