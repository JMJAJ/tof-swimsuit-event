"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { learnFromApiResponse } from "@/lib/user-search"
import { requestBatcher } from "@/lib/request-batcher"
import { WorkCard } from "@/components/work-card"
import { WorkCardSkeleton } from "@/components/work-card-skeleton"
import { WorkModal } from "@/components/work-modal"
import { Podium } from "@/components/podium"
import { FilterBar } from "@/components/filter-bar"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { APIResponse, Work } from "@/lib/data"
import { getServerRegion } from "@/lib/servers"

const fetcher = (url: string) => requestBatcher.fetch(url)

// Simple infinite scroll hook
function useInfiniteWorks(orderBy: string, workName: string, htuid: string) {
  const [allWorks, setAllWorks] = useState<Work[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const buildUrl = useCallback((page: number) => {
    return `/api/works?pageNo=${page}&orderBy=${orderBy}&tagIdList=&workName=${encodeURIComponent(workName)}&htuid=${encodeURIComponent(htuid)}`
  }, [orderBy, workName, htuid])

  // Load initial page with learning
  const { data: initialData, error: initialError, isLoading } = useSWR<APIResponse>(
    buildUrl(1),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // Dedupe requests for 5 seconds
      onSuccess: (data) => {
        setAllWorks(data.list || [])
        setHasNextPage(data.hasNext)
        setCurrentPage(1)
        setError(null)
        
        // Learn from the response
        if (data.list && data.list.length > 0) {
          learnFromApiResponse(data.list)
        }
      },
      onError: (err) => {
        setError(err.message)
      }
    }
  )

  // Remove preloading to prevent unnecessary requests

  // Reset when filters change
  useEffect(() => {
    setAllWorks([])
    setCurrentPage(1)
    setHasNextPage(true)
    setIsLoadingMore(false)
    setError(null)
  }, [orderBy, workName, htuid])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage || isLoading) return

    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    const url = buildUrl(nextPage)

    try {
      // Use SWR's mutate to leverage caching and deduplication
      const data = await mutate(url, fetcher(url), {
        revalidate: false,
      })
      
      setAllWorks(prev => [...prev, ...(data.list || [])])
      setHasNextPage(data.hasNext)
      setCurrentPage(nextPage)
      setError(null)
      
      // Learn from the response
      if (data.list && data.list.length > 0) {
        learnFromApiResponse(data.list)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasNextPage, isLoading, currentPage, buildUrl])

  return {
    works: allWorks,
    error: error || initialError,
    isLoading,
    isLoadingMore,
    hasNextPage,
    loadMore,
  }
}

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function WorkGallery() {
  const [sortBy, setSortBy] = useState<"ticket" | "recent">("ticket")
  const [selectedWork, setSelectedWork] = useState<Work | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [htuid, setHtuid] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("All")
  
  const debouncedHtuid = useDebounce(htuid, 150) // Reduced debounce time
  const orderBy = sortBy === "ticket" ? "ticket" : "id"

  const {
    works: allWorks,
    error,
    isLoading,
    isLoadingMore,
    hasNextPage,
    loadMore,
  } = useInfiniteWorks(orderBy, "", debouncedHtuid)

  const observerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const handleSortChange = (sort: "ticket" | "recent") => {
    setSortBy(sort)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  const handleUidChange = (uid: string) => {
    setHtuid(uid)
  }

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
  }

  // Filter works by region and calculate rankings
  const { filteredWorks, globalRankMap } = useMemo(() => {
    // Create global rank mapping (1-based)
    const globalRankMap = new Map<number, number>()
    allWorks.forEach((work, index) => {
      globalRankMap.set(work.id, index + 1)
    })

    if (selectedRegion === "All") {
      return { filteredWorks: allWorks, globalRankMap }
    }
    
    const filtered = allWorks.filter(work => {
      const workRegion = getServerRegion(work.serverName)
      return workRegion === selectedRegion
    })

    return { filteredWorks: filtered, globalRankMap }
  }, [allWorks, selectedRegion])

  // Throttled scroll handler for better performance
  const handleScroll = useCallback(() => {
    if (loadingRef.current || !hasNextPage || isLoadingMore) return

    const scrollTop = window.pageYOffset
    const windowHeight = window.innerHeight
    const docHeight = document.documentElement.offsetHeight

    if (scrollTop + windowHeight >= docHeight - 1500) { // Load when 1500px from bottom
      loadingRef.current = true
      loadMore().finally(() => {
        loadingRef.current = false
      })
    }
  }, [hasNextPage, isLoadingMore, loadMore])

  // Throttled scroll listener with longer delay
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const throttledScroll = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 200) // Increased delay
    }

    window.addEventListener('scroll', throttledScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [handleScroll])

  // Intersection Observer as backup with debouncing
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout
    
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasNextPage && !isLoadingMore && !loadingRef.current) {
          // Debounce the intersection trigger
          if (debounceTimeout) clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            if (!loadingRef.current) {
              loadingRef.current = true
              loadMore().finally(() => {
                loadingRef.current = false
              })
            }
          }, 300)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '800px', // Increased margin for earlier loading
      }
    )

    const currentRef = observerRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
    }
  }, [hasNextPage, isLoadingMore, loadMore])

  const handleLoadMore = useCallback(() => {
    if (!loadingRef.current && !isLoadingMore) {
      loadingRef.current = true
      loadMore().finally(() => {
        loadingRef.current = false
      })
    }
  }, [loadMore, isLoadingMore])

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load character submissions. Please try again later.</p>
      </div>
    )
  }

  const topWorks = filteredWorks.slice(0, 3)

  return (
    <div className="space-y-6">
      <FilterBar 
        sortBy={sortBy} 
        onSortChange={handleSortChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onUidChange={handleUidChange}
        selectedRegion={selectedRegion}
        onRegionChange={handleRegionChange}
      />

      {isLoading ? (
        <>
          {/* Show skeleton grid while loading */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <WorkCardSkeleton key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          {sortBy === "ticket" && topWorks.length >= 3 && (
            <Podium 
              topWorks={topWorks} 
              onWorkClick={setSelectedWork}
              regionName={selectedRegion !== "All" ? selectedRegion : undefined}
              globalRanks={selectedRegion !== "All" ? globalRankMap : undefined}
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {(sortBy === "ticket" && topWorks.length >= 3 ? filteredWorks.slice(3) : filteredWorks).map((work, index) => {
              // Calculate regional rank (add 1 for 1-based indexing, add 3 if showing podium)
              const regionalRank = (sortBy === "ticket" && topWorks.length >= 3 ? index + 4 : index + 1)
              
              // Get global rank if filtering by region
              const globalRank = selectedRegion !== "All" ? globalRankMap.get(work.id) : undefined
              
              return (
                <WorkCard 
                  key={work.id} 
                  work={work} 
                  rank={regionalRank}
                  globalRank={globalRank}
                  regionName={selectedRegion !== "All" ? selectedRegion : undefined}
                  onClick={() => setSelectedWork(work)} 
                />
              )
            })}
          </div>

          {/* Infinite scroll trigger */}
          {hasNextPage && (
            <div ref={observerRef} className="flex justify-center pt-6 pb-4">
              {isLoading || isLoadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              ) : (
                <Button 
                  onClick={handleLoadMore} 
                  variant="outline" 
                  size="sm"
                  className="opacity-50 hover:opacity-100 transition-opacity"
                >
                  Load More
                </Button>
              )}
            </div>
          )}

          {!hasNextPage && allWorks.length > 0 && (
            <div className="text-center pt-6 pb-4">
              <p className="text-sm text-muted-foreground">🎉 You've reached the end!</p>
            </div>
          )}

          {filteredWorks.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {selectedRegion === "All" 
                  ? "No character submissions found." 
                  : `No submissions found for ${selectedRegion}.`
                }
              </p>
            </div>
          )}
        </>
      )}

      {selectedWork && <WorkModal work={selectedWork} onClose={() => setSelectedWork(null)} />}
    </div>
  )
}
