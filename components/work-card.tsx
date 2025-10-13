"use client"

// import Image from "next/image" // Disabled to save image optimization quota
import { Trophy, User, Server } from "lucide-react"
import type { Work, ImageData } from "@/lib/data"
import { getRegionAbbreviation } from "@/lib/servers"

interface WorkCardProps {
  work: Work
  onClick: () => void
  rank?: number
  globalRank?: number
  regionName?: string
}

export function WorkCard({ work, onClick, rank, globalRank, regionName }: WorkCardProps) {
  let images: ImageData[] = []
  try {
    images = JSON.parse(work.image)
  } catch (e) {
    console.error("Failed to parse image data for work:", work.id)
    images = []
  }

  const previewImage = images[0] || { url: "/placeholder.svg", width: 480, height: 480 }

  return (
    <div
      className="group relative rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      {/* Compact Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={previewImage.url || "/placeholder.svg"}
          alt={work.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Ranking Badge */}
        {rank && (
          <div className="absolute top-2 left-2 flex flex-col items-center px-2 py-1 rounded-md bg-black text-white font-bold text-xs border border-white/20">
            {regionName && globalRank ? (
              <>
                <div>#{rank} {getRegionAbbreviation(regionName)}</div>
                <div className="text-[10px]">#{globalRank} Global</div>
              </>
            ) : (
              <div>#{rank}</div>
            )}
          </div>
        )}

        {/* Vote Badge - Shows current votes */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
          <Trophy className="w-3 h-3 text-yellow-400" />
          <span className="text-xs font-bold text-white">{work.ticket.toLocaleString()}</span>
        </div>
      </div>

      {/* Compact Content */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{work.name}</h3>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{work.roleName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Server className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{work.serverName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary">
            ID: {work.id}
          </span>
        </div>
      </div>
    </div>
  )
}