'use client'
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCampusFeed, useGroupFeed, wireRealtimeToQueryCache } from "@campus/data";

export default function FeedList({ groupId = null }: { groupId?: string | null }) {
  const key = groupId ? ['posts','group',groupId] : ['posts','campus']
  const qc = useQueryClient()
  const { data = [], isLoading } = groupId ? useGroupFeed(groupId) : useCampusFeed()

  React.useEffect(() => {
  const off = wireRealtimeToQueryCache(qc, key, groupId);
  return () => off();                   
}, [qc, key, groupId]);                 


  if (isLoading) return <div style={{ opacity:.6 }}>Loading feed…</div>
  if (!data.length) return <div style={{ opacity:.6 }}>No posts yet. Be the first!</div>

  return (
    <ul style={{ display:'grid', gap:12 }}>
      {data.map(p => (
        <li key={p.id} style={{ border:'1px solid #ddd', borderRadius:16, padding:12 }}>
          <div style={{ fontSize:12, opacity:.6, marginBottom:6 }}>{new Date(p.created_at).toLocaleString()}</div>
          <div style={{ whiteSpace:'pre-wrap' }}>{p.body}</div>
        </li>
      ))}
    </ul>
  )
}
