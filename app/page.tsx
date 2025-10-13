import { redirect } from 'next/navigation'

export default function Home() {
  // This will redirect to analytics, but we include this as a fallback
  redirect('/analytics')
}
