'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Network, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { Database } from '@/types/database'
import { getRelatedMemos } from '@/lib/actions/related'

type Memo = Database['public']['Tables']['memos']['Row']

interface GraphNode {
  id: string
  label: string
  category: string
  tags: string[]
  size: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  strength: number
}

interface GraphViewProps {
  memos: Memo[]
  selectedMemoId?: string
}

export function GraphView({ memos, selectedMemoId }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cyRef = useRef<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize Cytoscape
  useEffect(() => {
    const initCytoscape = async () => {
      if (!containerRef.current) return

      try {
        const cytoscape = (await import('cytoscape')).default

        const cy = cytoscape({
        container: containerRef.current,
        elements: [],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#3b82f6',
              'label': 'data(label)',
              'font-size': '12px',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#ffffff',
              'text-outline-width': 2,
              'text-outline-color': '#000000',
              'width': 'data(size)',
              'height': 'data(size)',
            }
          },
          {
            selector: 'node[category = "技術"]',
            style: {
              'background-color': '#10b981'
            }
          },
          {
            selector: 'node[category = "AI"]',
            style: {
              'background-color': '#10b981'
            }
          },
          {
            selector: 'node[category = "研究"]',
            style: {
              'background-color': '#f59e0b'
            }
          },
          {
            selector: 'node[category = "学習"]',
            style: {
              'background-color': '#8b5cf6'
            }
          },
          {
            selector: 'node[category = "仕事"]',
            style: {
              'background-color': '#ef4444'
            }
          },
          {
            selector: 'node[category = "個人"]',
            style: {
              'background-color': '#f97316'
            }
          },
          {
            selector: 'node[category = "一般"]',
            style: {
              'background-color': '#6b7280'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 3,
              'border-color': '#fbbf24'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 'data(strength)',
              'line-color': '#94a3b8',
              'target-arrow-color': '#94a3b8',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.6
            }
          },
          {
            selector: 'edge.highlighted',
            style: {
              'line-color': '#3b82f6',
              'target-arrow-color': '#3b82f6',
              'opacity': 1,
              'width': 4
            }
          }
        ],
        layout: {
          name: 'grid',
          fit: true,
          padding: 30,
          rows: undefined,
          cols: undefined
        }
      })

      // Handle node clicks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cy.on('tap', 'node', (event: any) => {
        const node = event.target
        const memoId = node.id()
        
        // Log click for debugging
        console.log('Graph node clicked:', memoId)
        
        // Highlight connected edges
        cy.elements().removeClass('highlighted')
        node.connectedEdges().addClass('highlighted')
      })

        cyRef.current = cy
      } catch (error) {
        console.error('Error initializing Cytoscape:', error)
      }
    }

    initCytoscape()

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }
    }
  }, [])

  // Build graph data
  const buildGraphData = useCallback(async () => {
    setIsLoading(true)
    
    try {
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []
      const addedEdges = new Set<string>()

      console.log('Building graph with', memos.length, 'memos')

      // Add nodes for each memo
      for (const memo of memos) {
        nodes.push({
          id: memo.id,
          label: memo.content.slice(0, 30) + (memo.content.length > 30 ? '...' : ''),
          category: memo.category || '一般',
          tags: memo.tags,
          size: Math.max(20, Math.min(50, memo.content.length / 10))
        })
      }

      // Add edges for related memos
      for (const memo of memos) {
        if (!memo.embedding || memo.embedding.length === 0) continue

        const relatedMemos = await getRelatedMemos(memo.id, 3)
        
        for (const related of relatedMemos) {
          const edgeId = [memo.id, related.id].sort().join('-')
          
          if (!addedEdges.has(edgeId) && related.similarity && related.similarity > 0.3) {
            edges.push({
              id: edgeId,
              source: memo.id,
              target: related.id,
              strength: Math.max(1, related.similarity * 5)
            })
            addedEdges.add(edgeId)
          }
        }
      }

      console.log('Graph built:', nodes.length, 'nodes,', edges.length, 'edges')
      return { nodes, edges }
    } catch (error) {
      console.error('Error building graph data:', error)
      return { nodes: [], edges: [] }
    } finally {
      setIsLoading(false)
    }
  }, [memos])

  // Update graph when memos change
  useEffect(() => {
    const updateGraph = async () => {
      if (!cyRef.current) {
        console.log('Cytoscape not initialized yet')
        return
      }

      const { nodes, edges } = await buildGraphData()

      const elements = [
        ...nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            category: node.category,
            size: node.size
          }
        })),
        ...edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            strength: edge.strength
          }
        }))
      ]

      console.log('Adding', elements.length, 'elements to graph')

      cyRef.current.elements().remove()
      cyRef.current.add(elements)
      
      if (elements.length > 0) {
        cyRef.current.layout({ name: 'grid', fit: true, padding: 30 }).run()
      }

      // Highlight selected node
      if (selectedMemoId) {
        cyRef.current.nodes().removeClass('selected')
        cyRef.current.getElementById(selectedMemoId).addClass('selected')
      }
    }

    updateGraph()
  }, [memos, selectedMemoId, buildGraphData])

  const handleRefresh = () => {
    if (cyRef.current) {
      cyRef.current.layout({ name: 'grid', fit: true, padding: 30 }).run()
    }
  }

  return (
    <Card className={`${isExpanded ? 'fixed inset-4 z-50' : ''} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="h-4 w-4" />
            知識グラフ
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className={`bg-muted rounded-lg ${isExpanded ? 'h-[calc(100vh-8rem)]' : 'h-[400px]'}`}
          style={{ width: '100%' }}
        />
        {memos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                メモを作成すると、ここに知識のつながりが表示されます！
              </p>
              <p className="text-xs text-muted-foreground">
                メモ数: {memos.length}
              </p>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                グラフを構築中...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}