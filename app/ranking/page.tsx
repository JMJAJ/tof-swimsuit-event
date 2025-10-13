import { WorkGallery } from "@/components/work-gallery"
import { Header } from "@/components/header"
import { StatsBar } from "@/components/stats-bar"
import { ScrollToTop } from "@/components/scroll-to-top"
import { PerformanceMonitor } from "@/components/performance-monitor"

export default function RankingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StatsBar />
      <main className="container mx-auto px-4 py-6">
        <WorkGallery />
      </main>
      <ScrollToTop />
      <PerformanceMonitor />
    </div>
  )
}