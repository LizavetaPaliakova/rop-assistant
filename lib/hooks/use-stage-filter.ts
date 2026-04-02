"use client"
import { useState, useEffect, useCallback } from "react"

const LS_KEY = "rop_excluded_stages"

export function useStageFilter() {
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setExcluded(new Set(JSON.parse(raw) as string[]))
    } catch {}
  }, [])

  const toggleStage = useCallback((stageId: string) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      localStorage.setItem(LS_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isIncluded = useCallback((stageId: string) => !excluded.has(stageId), [excluded])

  const resetFilter = useCallback(() => {
    setExcluded(new Set())
    localStorage.removeItem(LS_KEY)
  }, [])

  // Seeds lost-stage IDs as excluded if localStorage has never been written
  const seedLostStages = useCallback((lostIds: string[]) => {
    if (!localStorage.getItem(LS_KEY) && lostIds.length > 0) {
      const initial = new Set(lostIds)
      setExcluded(initial)
      localStorage.setItem(LS_KEY, JSON.stringify(lostIds))
    }
  }, [])

  return { isIncluded, toggleStage, excluded, resetFilter, seedLostStages }
}
