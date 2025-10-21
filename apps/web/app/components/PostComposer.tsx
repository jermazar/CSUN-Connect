'use client'
import * as React from 'react'
import { createPost } from '@campus/data'

export default function PostComposer({ groupId = null, onPosted }: { groupId?: string | null; onPosted?: () => void }) {
  const [val, setVal] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function submit() {
    if (!val.trim()) return
    setBusy(true); setErr(null)
    try {
      await createPost(val, groupId)
      setVal('')
      onPosted?.()
    } catch (e: any) {
      setErr(e.message || 'Failed to post')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ border:'1px solid #ddd', borderRadius:16, padding:12 }}>
      <textarea
        placeholder="What's happening on campus?"
        value={val}
        onChange={e=>setVal(e.target.value)}
        maxLength={5000}
        style={{ width:'100%', minHeight:80, resize:'vertical', outline:'none', border:0 }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
        <span style={{ opacity:.6, fontSize:12 }}>{val.length}/5000</span>
        <button onClick={submit} disabled={busy || !val.trim()} style={{ padding:'6px 10px', border:'1px solid #333', borderRadius:12, cursor:'pointer' }}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
      {err && <p style={{ color:'#b91c1c', marginTop:8, fontSize:12 }}>{err}</p>}

      {/* Mobile compose icon (focus the textarea) */}
      <button
        aria-label="Compose"
        onClick={()=>{
          const ta = document.querySelector('textarea') as HTMLTextAreaElement | null
          ta?.scrollIntoView({ behavior:'smooth', block:'center' })
          ta?.focus()
        }}
        style={{
          position:'fixed', right:24, bottom:24, borderRadius:9999, padding:16,
          boxShadow:'0 10px 20px rgba(0,0,0,.2)', border:'1px solid #333', background:'white',
          display:'inline-block'
        }}
        className="md:hidden"
      >＋</button>
    </div>
  )
}
