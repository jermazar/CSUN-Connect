import React from 'react';
import { Text, ScrollView } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpcomingEvents } from '@campus/data';
import { EventCard } from '@campus/ui';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <Home />
    </QueryClientProvider>
  );
}

function Home() {
  const { data = [] } = useUpcomingEvents();
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Upcoming Events</Text>
      {data.map((e) => (
        <EventCard key={e.id} title={e.title} date={e.start_time} />
      ))}
      {data.length === 0 && <Text>No events yet. Add one in Supabase.</Text>}
    </ScrollView>
  );
}
