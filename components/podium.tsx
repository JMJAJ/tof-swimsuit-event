"use client"

import Image from "next/image"
import { Trophy, Medal, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Work, ImageData } from "@/lib/data"
import { getRegionAbbreviation } from "@/lib/servers"

interface PodiumProps {
  topWorks: Work[]
  onWorkClick: (work: Work) => void
  regionName?: string
  globalRanks?: Map<number, number>
}

export function Podium({ topWorks, onWorkClick, regionName, globalRanks }: PodiumProps) {
  if (topWorks.length === 0) return null

  const getImage = (work: Work) => {
    try {
      const images: ImageData[] = JSON.parse(work.image)
      return images[0]?.url || "/placeholder.svg"
    } catch {
      return "/placeholder.svg"
    }
  }

  const medals = [Trophy, Medal, Award]
  const colors = ["text-yellow-500", "text-gray-400", "text-amber-600"]
  const borderColors = ["border-yellow-300 bg-yellow-50/50", "border-gray-300 bg-gray-50/50", "border-amber-300 bg-amber-50/50"]
  const badgeColors = ["bg-yellow-500", "bg-gray-400", "bg-amber-600"]

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          🏆 Top 3 Champions {regionName && `- ${getRegionAbbreviation(regionName)}`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {regionName ? `Best in ${regionName}` : "Most voted submissions"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
        {topWorks.slice(0, 3).map((work, index) => {
          const MedalIcon = medals[index]

          return (
            <div
              key={work.id}
              className={cn(
                "relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg",
                borderColors[index]
              )}
              onClick={() => onWorkClick(work)}
            >
              {/* Character Image */}
              <div className="relative aspect-square rounded-lg overflow-hidden mb-3 border">
                <Image
                  src={getImage(work)}
                  alt={work.name}
                  fill
                  className="object-cover transition-transform duration-200 hover:scale-110"
                  loading="lazy"
                />
                
                {/* Position Badge - On top of image */}
                <div className={cn(
                  "absolute top-2 left-2 rounded-lg flex flex-col items-center justify-center text-white font-bold text-xs shadow-lg px-2 py-1 bg-black/80 backdrop-blur-sm border-2",
                  index === 0 ? "border-yellow-400" : index === 1 ? "border-gray-400" : "border-amber-600"
                )}>
                  {regionName && globalRanks ? (
                    <>
                      <div className="text-sm">#{index + 1}</div>
                      <div className="text-[10px]">#{globalRanks.get(work.id) || '?'} Global</div>
                    </>
                  ) : (
                    <div className="text-sm">#{index + 1}</div>
                  )}
                </div>
              </div>

              {/* Work Info */}
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-sm text-foreground line-clamp-1">{work.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{work.roleName}</p>
                <div className="text-xs text-muted-foreground mb-1">ID: {work.id}</div>
                <div className={cn("flex items-center justify-center gap-1", colors[index])}>
                  <MedalIcon className="w-3 h-3" />
                  <span className="text-xs font-bold">{work.ticket.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
