import React, { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import anime from "animejs"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: "blue" | "red" | "orange" | "purple" | "green"
  subtitle?: string
  animate?: boolean
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/100",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    value: "text-blue-400",
  },
  red: {
    bg: "bg-red-500/100",
    border: "border-red-500/20",
    icon: "text-red-400",
    value: "text-red-400",
  },
  orange: {
    bg: "bg-orange-500/100",
    border: "border-orange-500/20",
    icon: "text-orange-400",
    value: "text-orange-400",
  },
  purple: {
    bg: "bg-cyan-500/100",
    border: "border-cyan-500/20",
    icon: "text-cyan-300",
    value: "text-cyan-300",
  },
  green: {
    bg: "bg-green-500/100",
    border: "border-green-500/20",
    icon: "text-green-400",
    value: "text-green-400",
  },
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  animate = true,
}: StatCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const colors = colorMap[color]

  useEffect(() => {
    if (animate && valueRef.current && typeof value === "number") {
      anime({
        targets: valueRef.current,
        innerHTML: [0, value],
        easing: "easeOutExpo",
        round: 1,
        duration: 1500,
      })
    }
  }, [value, animate])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "bg-zinc-900 border p-5 cursor-pointer transition-all duration-200 rounded-md",
        "hover:border-zinc-700 hover:bg-zinc-900/80",
        colors.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span
              ref={valueRef}
              className={cn("text-2xl font-bold", colors.value)}
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
            {subtitle && (
              <span className="text-xs text-zinc-500">{subtitle}</span>
            )}
          </div>
        </div>
        <div
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md",
            colors.bg
          )}
        >
          <Icon className={cn("w-5 h-5", colors.icon)} />
        </div>
      </div>
    </motion.div>
  )
}
