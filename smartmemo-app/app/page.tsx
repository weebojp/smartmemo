import { getMemos } from '@/lib/actions/memo'
import { MemoList } from '@/components/memo/memo-list'
import { GraphView } from '@/components/memo/graph-view'
import { MemoStats, PopularTags } from '@/components/memo/memo-stats'
import { UserNav } from '@/components/auth/user-nav'
import { AIDebugPanel } from '@/components/debug/ai-debug-panel'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const memos = await getMemos()

    // If no user, show landing page with login button
    if (!user) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">SmartMemo</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your AI-powered knowledge network
            </p>
            <div className="space-x-4">
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">SmartMemo</h1>
            <p className="text-muted-foreground">
              Your AI-powered knowledge network
            </p>
          </div>
          <UserNav user={user} />
        </div>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="list">メモ一覧</TabsTrigger>
            <TabsTrigger value="graph">知識グラフ</TabsTrigger>
            <TabsTrigger value="stats">統計</TabsTrigger>
            <TabsTrigger value="debug">AI診断</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            <MemoList memos={memos} />
          </TabsContent>
          
          <TabsContent value="graph">
            <GraphView 
              memos={memos}
              selectedMemoId={undefined}
            />
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="space-y-6">
              <MemoStats memos={memos} />
              <PopularTags memos={memos} />
            </div>
          </TabsContent>

          <TabsContent value="debug">
            <AIDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  } catch (error) {
    console.error('Error in Home page:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold mb-4">SmartMemo</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your AI-powered knowledge network
          </p>
          <p className="text-red-500 mb-4">
            Please set up your environment variables (.env.local)
          </p>
          <div className="space-x-4">
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
