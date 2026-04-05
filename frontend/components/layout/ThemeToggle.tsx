import React from "react"
import { motion } from "framer-motion"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeContext"
import { cn } from "@/lib/utils"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-16 h-8 rounded-full border transition-colors duration-200",
        theme === "dark"
          ? "bg-zinc-900 border-zinc-700"
          : "bg-zinc-200 border-zinc-300"
      )}
      aria-label="Toggle theme"
    >
      <span className="absolute left-2 text-zinc-500 pointer-events-none">
        <Moon className="w-3.5 h-3.5" />
      </span>
      <span className="absolute right-2 text-zinc-500 pointer-events-none">
        <Sun className="w-3.5 h-3.5" />
      </span>

      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "absolute top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm",
          theme === "dark"
            ? "left-1 bg-cyan-500 text-white"
            : "left-9 bg-orange-500 text-white"
        )}
      >
        {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      </motion.div>
    </button>
  )
}
