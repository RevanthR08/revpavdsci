import React from "react"
import { motion } from "framer-motion"
import { Upload, FileSearch, Shield, GitBranch, Sparkles, ChevronRight, Activity, Zap, Fingerprint, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface FlowStep {
  label: string
  icon: any
  color: string
  bg: string
  value?: string
  delay: number
}

interface AttackFlowProps {
  totalEvents: number
  totalFindings: number
  totalChains: number
  threatLevel: string
}

export default function AttackFlow({ totalEvents, totalFindings, totalChains, threatLevel }: AttackFlowProps) {
  const steps: FlowStep[] = [
    { 
      label: "Ingestion", 
      icon: Upload, 
      color: "text-primary", 
      bg: "bg-primary/10 border-primary/20", 
      value: `${totalEvents.toLocaleString()} Events`,
      delay: 0
    },
    { 
      label: "Heuristic", 
      icon: FileSearch, 
      color: "text-cyan-400", 
      bg: "bg-cyan-500/10 border-cyan-500/20", 
      value: `${totalFindings} Signals`,
      delay: 0.1
    },
    { 
      label: "Linkage", 
      icon: GitBranch, 
      color: "text-accent", 
      bg: "bg-accent/10 border-accent/20", 
      value: `${totalChains} Chains`,
      delay: 0.2
    },
    { 
      label: "Adjudication", 
      icon: Target, 
      color: threatLevel === "CRITICAL" ? "text-red-400" : "text-emerald-400", 
      bg: threatLevel === "CRITICAL" ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20", 
      value: threatLevel,
      delay: 0.3
    },
    { 
      label: "Synthesis", 
      icon: Sparkles, 
      color: "text-amber-400", 
      bg: "bg-amber-500/10 border-amber-500/20", 
      value: "Encoded",
      delay: 0.4
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-8 rounded-[2rem] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
         <Zap className="w-32 h-32 -rotate-12" />
      </div>

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
           <Activity className="w-4 h-4 text-primary" />
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Neural Intelligence Pipeline</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.05]">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
           <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Flow-Matrix Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <React.Fragment key={step.label}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: step.delay, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex flex-col items-center group relative cursor-default"
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl shadow-primary/5 relative overflow-hidden",
                  step.bg
                )}>
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Icon className={cn("w-7 h-7 relative z-10 transition-transform group-hover:rotate-6", step.color)} />
                </div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] text-center mb-1.5">{step.label}</h4>
                {step.value && <p className="text-[11px] font-bold text-zinc-500 mono-data uppercase tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">{step.value}</p>}
              </motion.div>

              {index < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center flex-1 px-2 pt-6">
                  <div className="relative w-full h-[1px]">
                     <div className="absolute inset-0 bg-white/[0.05]" />
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: '100%' }}
                       transition={{ duration: 1, delay: step.delay + 0.3 }}
                       className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" 
                     />
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-800 ml-1" />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </motion.div>
  )
}
