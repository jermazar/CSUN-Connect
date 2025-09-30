'use client'
import { supabase } from '@campus/data'

export function SignOutButton() {
  return (
    <button
      onClick={async () => { await supabase.auth.signOut(); location.reload() }}
      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #333', background: 'white', cursor: 'pointer' }}
    >
      Sign Out
    </button>
  )
}
