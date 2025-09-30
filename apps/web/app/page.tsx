'use client'
import { useUpcomingEvents } from '@campus/data'
import { EventCard } from '@campus/ui'

export default function Page() {
  const { data = [] } = useUpcomingEvents()
  return (
    <main>
      <h1>Upcoming Events</h1>
      <div style={{ display: 'grid', gap: 12 }}>
        {data.map(e => <EventCard key={e.id} title={e.title} date={e.start_time} />)}
        {data.length === 0 && <p>No events yet. Add one in Supabase or via your app.</p>}
      </div>
    </main>
  )
}
