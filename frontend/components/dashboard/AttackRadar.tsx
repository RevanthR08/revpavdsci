import React from "react"
import { motion } from "framer-motion"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"
import { CircleDot } from "lucide-react"

interface AttackRadarProps {
  findings: { detection_type: string; severity: string }[]
}

export default function AttackRadar({ findings }: AttackRadarProps) {
  const categories = [
    { name: "Deterministic", key: "rule", color: "hsla(var(--primary), 1)" },
    { name: "Heuristic", key: "ml_anomaly", color: "hsla(var(--accent), 1)" },
    { name: "Geo-Spatial", key: "impossible_travel", color: "#f97316" },
    { name: "Escalation", key: "priv_esc", color: "#ef4444" },
    { name: "Persistence", key: "persistence", color: "#06b6d4" },
    { name: "Lateral", key: "lateral", color: "#10b981" },
  ]

  const typeCounts: Record<string, number> = {}
  findings.forEach(f => {
    typeCounts[f.detection_type] = (typeCounts[f.detection_type] || 0) + 1
  })

  // Normalize data for radar scale consistency
  const data = categories.map(cat => ({
    subject: cat.name,
    count: typeCounts[cat.key] || 0,
  }))

  const maxVal = Math.max(...data.map(d => d.count), 5)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="glass-card p-6 rounded-[2rem] relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
           <CircleDot className="w-4 h-4 text-cyan-400" />
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Detection Topology Matrix</h3>
        </div>
      </div>
      
      <div className="h-[240px] flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="white" strokeOpacity={0.03} />
            <PolarAngleAxis 
               dataKey="subject" 
               tick={{ fontSize: 9, fill: "#52525b", fontWeight: 'bold' }} 
               tickLine={false}
               dy={3}
            />
            <PolarRadiusAxis 
               angle={30} 
               domain={[0, maxVal]} 
               tick={false} 
               axisLine={false} 
            />
            <Radar
              name="Detected Signals"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={3}
              fill="var(--primary)"
              fillOpacity={0.15}
              animationDuration={2000}
              dot={{ r: 3, fill: 'white', fillOpacity: 0.8, stroke: 'var(--primary)', strokeWidth: 1.5 }}
            />
          </RadarChart>
        </ResponsiveContainer>
        
        {/* Radar Value Overlay for higher fidelity */}
        <div className="absolute bottom-[-10px] left-0 w-full flex justify-center gap-4">
           {data.slice(0, 3).map(d => (
             <div key={d.subject} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mono-data">{d.count}</span>
             </div>
           ))}
        </div>
      </div>
    </motion.div>
  )
}
