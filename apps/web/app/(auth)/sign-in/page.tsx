'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@campus/data'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        const userId = data.user?.id
        if (userId) {
          // Best-effort: create or update a profile row for this user
          await supabase.from('profiles').upsert({ user_id: userId })
        }
      }
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 16 }}>{mode === 'signin' ? 'Sign In' : 'Create account'}</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Email</div>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
            placeholder="you@example.edu"
          />
        </label>

        <label>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Password</div>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
            placeholder="••••••••"
          />
        </label>

        {error && <div style={{ color: 'crimson', fontSize: 14 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #333',
            background: '#111',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create account'}
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button onClick={() => setMode('signup')} style={{ color: '#2563eb', background: 'none', border: 0, cursor: 'pointer' }}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button onClick={() => setMode('signin')} style={{ color: '#2563eb', background: 'none', border: 0, cursor: 'pointer' }}>
              Sign in
            </button>
          </>
        )}
      </div>
    </main>
  )
}
