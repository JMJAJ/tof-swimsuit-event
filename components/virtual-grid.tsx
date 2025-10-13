"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { WorkCard } from "@/components/work-card"
import type { Work } from "@/lib/data"

interface VirtualGridProps {
  works: Work[]
  onWorkClick: (work: Work) => void
  isLoading?: boolean
}

const ITEM_HEIGHT = 280 // Approximate height of each card
const ITEMS_PER_ROW = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
}

export function VirtualGrid({ works, onWorkClick, isLoading }: VirtualGridProps) {
  const [containerHeight, setContainerHeight] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [itemsPerRow, setItemsPerRow] = useState(ITEMS_PER_ROW.lg)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update items per row based on screen size
  useEffect(() => {
    const updateItemsPerRow = () => {
      const width = window.innerWidth
      if (width < 768) {
        setItemsPerRow(ITEMS_PER_ROW.sm)
      } else if (width < 1024) {
        setItemsPerRow(ITEMS_PER_ROW.md)
      } else if (width < 1280) {
        setItemsPerRow(ITEMS_PER_ROW.lg)
      } else {
        setItemsPerRow(ITEMS_PER_ROW.xl)
      }
    }

    updateItemsPerRow()
    window.addEventListener('resize', updateItemsPerRow)
    return () => window.removeEventListener('resize', updateItemsPerRow)
  }, [])

  // Update container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const totalRows = Math.ceil(works.length / itemsPerRow)
  const totalHeight = totalRows * ITEM_HEIGHT

  const visibleRows = useMemo(() => {
    const startRow = Math.floor(scrollTop / ITEM_HEIGHT)
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + 1
    )
    return { startRow, endRow }
  }, [scrollTop, containerHeight, totalRows])

  const visibleItems = useMemo(() => {
    const { startRow, endRow } = visibleRows
    const items = []
    
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < itemsPerRow; col++) {
        const index = row * itemsPerRow + col
        if (index < works.length) {
          items.push({
            work: works[index],
            index,
            row,
            col,
            top: row * ITEM_HEIGHT,
          })
        }
      }
    }
    
    return items
  }, [works, visibleRows, itemsPerRow])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      style={{ height: '70vh' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ work, index, top }) => (
          <div
            key={work.id}
            className="absolute"
            style={{
              top,
              left: `${(index % itemsPerRow) * (100 / itemsPerRow)}%`,
              width: `${100 / itemsPerRow}%`,
              height: ITEM_HEIGHT,
              padding: '8px',
            }}
          >
            <WorkCard work={work} onClick={() => onWorkClick(work)} />
          </div>
        ))}
      </div>
    </div>
  )
}