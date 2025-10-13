'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

export function AnalyticsStatus() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Only show on localhost
  if (!isClient || (typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') && 
      !window.location.hostname.includes('127.0.0.1'))) {
    return null
  }
}