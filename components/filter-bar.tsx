"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrendingUp, Clock, Search, Globe } from "lucide-react"
import { searchUsersByName, getSearchSuggestions } from "@/lib/user-search"
import { getAllRegions } from "@/lib/servers"

interface FilterBarProps {
  sortBy: "ticket" | "recent"
  onSortChange: (sort: "ticket" | "recent") => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onUidChange: (uid: string) => void
  selectedRegion: string
  onRegionChange: (region: string) => void
}

export function FilterBar({ sortBy, onSortChange, searchQuery, onSearchChange, onUidChange, selectedRegion, onRegionChange }: FilterBarProps) {
  const [nameQuery, setNameQuery] = useState(searchQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Get suggestions as user types (only for non-numeric input)
  useEffect(() => {
    const getSuggestions = async () => {
      if (nameQuery.length >= 1 && !isNumericUID(nameQuery)) {
        setIsLoadingSuggestions(true)
        try {
          const results = await getSearchSuggestions(nameQuery, 8)
          setSuggestions(results)
          setShowSuggestions(results.length > 0)
        } catch (error) {
          console.error('Search error:', error)
          setSuggestions([])
          setShowSuggestions(false)
        } finally {
          setIsLoadingSuggestions(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
        setIsLoadingSuggestions(false)
      }
    }

    // Faster response - 100ms for first character, 50ms for subsequent
    const delay = nameQuery.length === 1 ? 100 : 50
    const timeoutId = setTimeout(getSuggestions, delay)
    return () => clearTimeout(timeoutId)
  }, [nameQuery])

  // Auto-search when user stops typing
  useEffect(() => {
    const autoSearch = () => {
      if (nameQuery.trim()) {
        handleSmartSearch()
      } else {
        onUidChange("")
        onSearchChange("")
      }
    }

    const timeoutId = setTimeout(autoSearch, 800) // Auto-search after 800ms of no typing
    return () => clearTimeout(timeoutId)
  }, [nameQuery])

  // Check if input looks like a UID (numeric)
  const isNumericUID = (input: string): boolean => {
    return /^\d+$/.test(input.trim())
  }

  // Handle name selection from dropdown
  const handleNameSelect = async (selectedName: string) => {
    setNameQuery(selectedName)
    setShowSuggestions(false)
    
    // Search by name to show ALL players with that name
    onUidChange("") // Clear UID to show all matches
    onSearchChange(selectedName)
  }

  // Smart search - handles both names and UIDs
  const handleSmartSearch = async () => {
    const query = nameQuery.trim()
    if (!query) {
      // Clear search
      onUidChange("")
      onSearchChange("")
      return
    }
    
    if (isNumericUID(query)) {
      // Direct UID search
      onUidChange(query)
      setShowSuggestions(false)
    } else {
      // Name search
      const results = await searchUsersByName(query)
      if (results.length > 0) {
        onUidChange(results[0].uid)
        setShowSuggestions(false)
      }
    }
    onSearchChange(query)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const regions = getAllRegions()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-card border border-border">
        <Button
          variant={sortBy === "ticket" ? "default" : "outline"}
          size="sm"
          onClick={() => onSortChange("ticket")}
          className="rounded-md"
        >
          <TrendingUp className="w-4 h-4 mr-1" />
          Top Voted
        </Button>
        <Button
          variant={sortBy === "recent" ? "default" : "outline"}
          size="sm"
          onClick={() => onSortChange("recent")}
          className="rounded-md"
        >
          <Clock className="w-4 h-4 mr-1" />
          Recent
        </Button>
      </div>

      {/* Region Filter */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary/50">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            variant={selectedRegion === "All" ? "default" : "ghost"}
            size="sm"
            onClick={() => onRegionChange("All")}
            className="text-xs h-7"
          >
            All Regions
          </Button>
          {regions.map((region) => (
            <Button
              key={region}
              variant={selectedRegion === region ? "default" : "ghost"}
              size="sm"
              onClick={() => onRegionChange(region)}
              className="text-xs h-7"
            >
              {region.replace(" ", " ")}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="relative max-w-md mx-auto" ref={suggestionsRef}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by player name or user ID..."
          value={nameQuery}
          onChange={(e) => {
            setNameQuery(e.target.value)
            onSearchChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSmartSearch()
            }
          }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="pl-10 h-10 text-center"
        />
        
        {/* Autocomplete suggestions */}
        {(showSuggestions || isLoadingSuggestions) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
            {isLoadingSuggestions ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => {
                // Highlight matching text
                const queryLower = nameQuery.toLowerCase()
                const suggestionLower = suggestion.toLowerCase()
                const matchIndex = suggestionLower.indexOf(queryLower)
                
                const renderHighlighted = () => {
                  if (matchIndex !== -1) {
                    const before = suggestion.slice(0, matchIndex)
                    const match = suggestion.slice(matchIndex, matchIndex + nameQuery.length)
                    const after = suggestion.slice(matchIndex + nameQuery.length)
                    return (
                      <>
                        {before}
                        <span className="bg-primary/20 text-primary font-semibold">{match}</span>
                        {after}
                      </>
                    )
                  }
                  return suggestion
                }
                
                return (
                  <button
                    key={index}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors border-none bg-transparent"
                    onClick={() => handleNameSelect(suggestion)}
                  >
                    {renderHighlighted()}
                  </button>
                )
              })
            ) : nameQuery.length > 0 && !isNumericUID(nameQuery) ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No players found
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
