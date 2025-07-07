import { create } from 'zustand'
import { Database } from '@/types/database'

type Memo = Database['public']['Tables']['memos']['Row']

interface PendingDeletion {
  id: string
  memo: Memo
  timeoutId: NodeJS.Timeout
  deletedAt: Date
}

interface UndoState {
  pendingDeletions: Map<string, PendingDeletion>
  addPendingDeletion: (memo: Memo, onExpire: () => void) => void
  removePendingDeletion: (id: string) => void
  isPendingDeletion: (id: string) => boolean
  undoDelete: (id: string) => Memo | null
  cleanup: () => void
}

const UNDO_TIMEOUT = 5000 // 5 seconds

export const useUndoStore = create<UndoState>((set, get) => ({
  pendingDeletions: new Map(),

  addPendingDeletion: (memo, onExpire) => {
    const { pendingDeletions } = get()
    
    // Clear existing timeout if any
    const existing = pendingDeletions.get(memo.id)
    if (existing) {
      clearTimeout(existing.timeoutId)
    }

    // Create new timeout
    const timeoutId = setTimeout(() => {
      onExpire()
      get().removePendingDeletion(memo.id)
    }, UNDO_TIMEOUT)

    // Add to pending deletions
    const newPending = new Map(pendingDeletions)
    newPending.set(memo.id, {
      id: memo.id,
      memo,
      timeoutId,
      deletedAt: new Date()
    })

    set({ pendingDeletions: newPending })
  },

  removePendingDeletion: (id) => {
    const { pendingDeletions } = get()
    const pending = pendingDeletions.get(id)
    
    if (pending) {
      clearTimeout(pending.timeoutId)
      const newPending = new Map(pendingDeletions)
      newPending.delete(id)
      set({ pendingDeletions: newPending })
    }
  },

  isPendingDeletion: (id) => {
    return get().pendingDeletions.has(id)
  },

  undoDelete: (id) => {
    const { pendingDeletions } = get()
    const pending = pendingDeletions.get(id)
    
    if (pending) {
      clearTimeout(pending.timeoutId)
      const newPending = new Map(pendingDeletions)
      newPending.delete(id)
      set({ pendingDeletions: newPending })
      return pending.memo
    }
    return null
  },

  cleanup: () => {
    const { pendingDeletions } = get()
    pendingDeletions.forEach((pending) => {
      clearTimeout(pending.timeoutId)
    })
    set({ pendingDeletions: new Map() })
  }
}))