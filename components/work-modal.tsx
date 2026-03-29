"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X, Trophy, User, Server, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Work, ImageData } from "@/lib/data"

interface WorkModalProps {
  work: Work
  onClose: () => void
}

export function WorkModal({ work, onClose }: WorkModalProps) {
  const [currentImageType, setCurrentImageType] = useState(0)

  let images: ImageData[] = []
  if (work.image) {
    try {
      images = JSON.parse(work.image)
    } catch {
      images = []
    }
  }

  if ((!images || images.length === 0) && Array.isArray(work.imageUrls) && work.imageUrls.length > 0) {
    images = work.imageUrls.map((url) => ({ url, width: 480, height: 480 }))
  }

  const currentImage = images[currentImageType] || images[0] || { url: "/placeholder.svg", width: 480, height: 480 }

  // Removed aggressive preloading to reduce origin transfer

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && currentImageType > 0) {
        setCurrentImageType(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentImageType < images.length - 1) {
        setCurrentImageType(prev => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentImageType, images.length, onClose])

  const nextImage = () => {
    if (currentImageType < images.length - 1) {
      setCurrentImageType(prev => prev + 1)
    }
  }

  const prevImage = () => {
    if (currentImageType > 0) {
      setCurrentImageType(prev => prev - 1)
    }
  }



  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 right-4 z-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="p-6 space-y-6">
          {/* Image Navigation */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {images.map((img, index) => (
                <Button
                  key={index}
                  variant={currentImageType === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentImageType(index)}
                  className="rounded-full"
                >
                  {index === 0 ? "Portrait" : index === 1 ? "Landscape 1" : "Landscape 2"}
                </Button>
              ))}
            </div>
          )}

          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-foreground text-balance">{work.name}</h2>

          {/* Image Display */}
          <div className="relative w-full aspect-square max-h-[500px] rounded-xl overflow-hidden bg-secondary group">
            <Image 
              src={currentImage.url || "/placeholder.svg"} 
              alt={work.name} 
              fill 
              className="object-contain transition-opacity duration-200" 
              loading="lazy"
            />
            
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  onClick={prevImage}
                  disabled={currentImageType === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  onClick={nextImage}
                  disabled={currentImageType === images.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            
            {/* Removed hidden preloaded images to reduce origin transfer */}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Character Info */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary mb-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Character</span>
              </div>
              <div className="font-bold text-foreground">{work.roleName}</div>
              {work.htUid && (
                <div className="text-xs text-muted-foreground">Character ID: {work.htUid}</div>
              )}
            </div>

            {/* Server & Submission Info */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Server className="w-4 h-4" />
                <span className="text-sm font-medium">Details</span>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">{work.serverName}</div>
                <div className="text-xs text-muted-foreground">Submission ID: {work.id}</div>
                <div className="text-xs text-muted-foreground">{new Date(work.createtime).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Votes */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Votes</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{work.ticket.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
