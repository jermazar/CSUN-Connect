'use client';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCampusFeed, useGroupFeed, wireRealtimeToQueryCache } from "@campus/data";

export default function FeedList({ groupId = null }: { groupId?: string | null }) {
  const key = groupId ? ['posts', 'group', groupId] : ['posts', 'campus'];
  const qc = useQueryClient();
  const { data = [], isLoading } = groupId ? useGroupFeed(groupId) : useCampusFeed();

  React.useEffect(() => {
    const off = wireRealtimeToQueryCache(qc, key, groupId);
    return () => off();
  }, [qc, key, groupId]);

  if (isLoading) return <div style={{ opacity: .6, color: "var(--muted)" }}>Loading feed…</div>;
  if (!data.length) return <div style={{ opacity: .6, color: "var(--muted)" }}>No posts yet. Be the first!</div>;

  return (
    <ul style={{ display: 'grid', gap: 12 }}>
      {data.map(p => (
        <li
          key={p.id}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 16,
            background: 'var(--card)',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
          }}
        >
          {/* header row with time */}
          <div style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginBottom: 6,
            textAlign: 'right'
          }}>
            {new Date(p.created_at).toLocaleString()}
          </div>

          {/* body text */}
          <div style={{
            whiteSpace: 'pre-wrap',
            color: 'var(--text)',
            lineHeight: 1.5,
          }}>
            {p.body}
          </div>
        </li>
      ))}
    </ul>
  );
}
