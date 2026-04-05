import React from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)

      if (currentPage > 3) pages.push("...")

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) pages.push(i)

      if (currentPage < totalPages - 2) pages.push("...")

      pages.push(totalPages)
    }

    return pages
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex items-center justify-center gap-1 py-4"
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        title="Previous page"
        aria-label="Previous page"
        className={cn(
          "flex items-center justify-center w-8 h-8 transition-colors rounded",
          currentPage === 1
            ? "text-zinc-600 cursor-not-allowed"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === "..." ? (
            <span className="w-8 h-8 flex items-center justify-center text-xs text-zinc-500">
              ...
            </span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={cn(
                "flex items-center justify-center w-8 h-8 text-xs font-medium transition-colors rounded",
                currentPage === page
                  ? "bg-gradient-to-r from-cyan-500 to-orange-500 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Next page"
        aria-label="Next page"
        className={cn(
          "flex items-center justify-center w-8 h-8 transition-colors rounded",
          currentPage === totalPages
            ? "text-zinc-600 cursor-not-allowed"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
