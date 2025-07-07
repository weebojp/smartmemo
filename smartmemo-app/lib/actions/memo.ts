'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { processAndUpdateMemo } from './ai'

const createMemoSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  contentMarkdown: z.string().min(1, 'Content is required'),
  source: z.enum(['manual', 'web', 'api']).default('manual'),
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
})

export async function createMemo(data: z.infer<typeof createMemoSchema>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const validatedData = createMemoSchema.parse(data)
  
  const { data: newMemo, error } = await supabase
    .from('memos')
    .insert({
      user_id: user.id,
      content: validatedData.content,
      content_markdown: validatedData.contentMarkdown,
      source: validatedData.source,
      source_url: validatedData.sourceUrl,
      source_title: validatedData.sourceTitle,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Process memo with AI in background
  if (newMemo) {
    processAndUpdateMemo(newMemo.id).catch(console.error)
  }

  revalidatePath('/memos')
}

export async function updateMemo(id: string, data: Partial<z.infer<typeof createMemoSchema>>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('memos')
    .update({
      content: data.content,
      content_markdown: data.contentMarkdown,
      source: data.source,
      source_url: data.sourceUrl,
      source_title: data.sourceTitle,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/memos')
}

export async function deleteMemo(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/memos')
}

export async function permanentlyDeleteMemo(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/memos')
}

export async function getMemos() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching memos:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getMemos:', error)
    return []
  }
}

export async function getMemo(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}