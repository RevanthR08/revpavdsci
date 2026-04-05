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
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ActivitySquare, Route, Server, ShieldAlert, Users, Target, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartDatum {
  name: string
  value: number
  color?: string
}

interface TimelineDatum {
  time: string
  count: number
}

interface AssetDatum {
  name: string
  count: number
  kind: "User" | "Host"
}

interface TacticDatum {
  name: string
  count: number
}

interface MitreDatum {
  id: string
  count: number
}

interface SummaryVisualBoardProps {
  riskScore: number
  threatLevel: string
  totalFindings: number
  totalChains: number
  affectedUsers: number
  affectedHosts: number
  travelCount: number
  severityData: ChartDatum[]
  detectionData: ChartDatum[]
  timelineData: TimelineDatum[]
  topAssets: AssetDatum[]
  tacticData: TacticDatum[]
  mitreData: MitreDatum[]
}

const TACTIC_COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981"]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl bg-[#0a0a0c]/90 backdrop-blur-3xl border border-white/10 p-3 shadow-2xl">
      {label && <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1.5">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
             <p className="text-xs text-white font-bold tracking-tight">
               <span className="opacity-50 uppercase text-[9px] mr-1">{entry.name}:</span>
               <span className="mono-data">{entry.value.toLocaleString()}</span>
             </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SummaryVisualBoard({
  riskScore,
  threatLevel,
  totalFindings,
  totalChains,
  affectedUsers,
  affectedHosts,
  travelCount,
  severityData,
  detectionData,
  timelineData,
  topAssets,
  tacticData,
  mitreData,
}: SummaryVisualBoardProps) {
  const riskIndex = riskScore
  const sevColor = riskIndex >= 80 ? "#ef4444" : riskIndex >= 50 ? "#f59e0b" : riskIndex >= 20 ? "#10b981" : "#3b82f6"
  
  const riskGaugeData = [
    { name: "Risk", value: riskIndex, fill: sevColor }
  ]

  const metricCards = [
    {
      label: "Risk Index",
      value: riskIndex.toString(),
      helper: threatLevel.toUpperCase(),
      icon: ShieldAlert,
      color: sevColor,
      delay: 0,
    },
    {
      label: "Threat Signals",
      value: totalFindings.toLocaleString(),
      helper: `${totalChains} Correlation Chains`,
      icon: ActivitySquare,
      color: "#f59e0b",
      delay: 0.1,
    },
    {
      label: "Impacted Entities",
      value: (affectedUsers + affectedHosts).toLocaleString(),
      helper: `${affectedUsers} Users · ${affectedHosts} Hosts`,
      icon: Target,
      color: "#3b82f6",
      delay: 0.2,
    },
    {
      label: "Geo Anomalies",
      value: travelCount.toString(),
      helper: "Travel Pattern Violations",
      icon: Route,
      color: travelCount > 0 ? "#ef4444" : "#10b981",
      delay: 0.3,
    },
  ]

  return (
    <div className="space-y-8 animate-reveal">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {metricCards.map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: card.delay, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass-card p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-3">{card.label}</p>
                <h4 className="text-3xl font-black text-white tracking-tighter mb-2 mono-data">{card.value}</h4>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{card.helper}</p>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shadow-xl">
                 <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Risk Potency Meter</p>
          <div className="relative flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="75%"
                outerRadius="100%"
                data={riskGaugeData}
                startAngle={225}
                endAngle={-45}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar 
                  background={{ fill: 'white', opacity: 0.03 }} 
                  dataKey="value" 
                  cornerRadius={20} 
                  animationDuration={1500}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <p className="text-5xl font-black text-white tracking-tighter mono-data animate-pulse-glow">{riskIndex}</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2">DSI Score</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Severity Distribution</p>
          <div className="flex-1 min-h-[240px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData.length ? severityData : [{ name: 'N/A', value: 1 }]}
                  innerRadius={70}
                  outerRadius={100}
                  dataKey="value"
                  stroke="none"
                  paddingAngle={5}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || TACTIC_COLORS[index % TACTIC_COLORS.length]} />
                  ))}
                  {severityData.length === 0 && <Cell fill="#1a1a1e" />}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {severityData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest truncate">{entry.name}</span>
                <span className="ml-auto text-[10px] font-black text-white mono-data">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Neural Signals Timeline</p>
          <div className="flex-1 min-h-[240px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sevColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={sevColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="white" strokeDasharray="3 3" vertical={false} opacity={0.03} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 9, fill: "#52525b", fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: "#52525b", fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke={sevColor} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorArea)" 
                    animationDuration={2000}
                  />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 glass-card p-8">
           <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">High Value Targets</p>
                <h4 className="text-xl font-black text-white tracking-tight">System Node Exposure Level</h4>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">
                    <Users className="w-3 h-3" /> User Context
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[9px] font-black text-accent uppercase tracking-widest">
                    <Server className="w-3 h-3" /> Host Context
                 </div>
              </div>
           </div>
           
           <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAssets} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="white" horizontal={true} vertical={false} opacity={0.02} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 10, fill: "white", fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                    {topAssets.map((entry, index) => (
                      <Cell key={index} fill={entry.kind === "User" ? "var(--primary)" : "var(--accent)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="xl:col-span-2 glass-card p-8 flex flex-col">
           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Tactical Triage Heatmap</p>
           <div className="flex-1 min-h-[220px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={tacticData} margin={{ bottom: 20 }}>
                 <CartesianGrid stroke="white" strokeDasharray="3 3" vertical={false} opacity={0.03} />
                 <XAxis 
                   dataKey="name" 
                   tick={{ fontSize: 9, fill: "#71717a", fontWeight: 'bold' }} 
                   axisLine={false} 
                   tickLine={false}
                   interval={0}
                   angle={-45}
                   textAnchor="end"
                   height={60}
                 />
                 <YAxis 
                   tick={{ fontSize: 9, fill: "#71717a", fontWeight: 'bold' }} 
                   axisLine={false} 
                   tickLine={false} 
                 />
                 <Tooltip content={<ChartTooltip />} />
                 <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={30}>
                   {tacticData.map((entry, index) => (
                     <Cell key={index} fill={TACTIC_COLORS[index % TACTIC_COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
           
           <div className="mt-8 pt-6 border-t border-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">MITRE Framework Coverage</p>
                 <span className="text-[9px] font-black text-zinc-600">HEAT-SYNC ACTIVE</span>
              </div>
              <div className="flex flex-wrap gap-2">
                 {mitreData.map(m => (
                   <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer group/mitre">
                      <span className="text-[10px] font-black text-primary mono-data">{m.id}</span>
                      <div className="w-[1px] h-3 bg-white/10" />
                      <span className="text-[10px] font-bold text-zinc-400 group-hover/mitre:text-white transition-colors">{m.count}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
