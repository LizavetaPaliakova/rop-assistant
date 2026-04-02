"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Pipeline, Manager, DashboardStats, AiAlert } from "@/lib/types"
import {
  mockManagers, mockPipelines, mockDashboardStats,
  mockAiAlerts, mockWeeklyData, mockDealsActivity,
} from "@/lib/mock-data"

export interface AmoConnection {
  connected: boolean
  domain: string | null
  lastSyncAt: string | null
  leadsCount: number
  managersCount: number
}

export interface AmoData {
  pipelines: Pipeline[]
  managers: Manager[]
  stats: DashboardStats
  alerts: AiAlert[]
  weeklyData: typeof mockWeeklyData
  activityData: typeof mockDealsActivity
}

interface AmoContextValue {
  connection: AmoConnection
  data: AmoData
  isLoading: boolean
  isSyncing: boolean
  isDemo: boolean          // true when using mock data
  sync: () => Promise<void>
  disconnect: () => Promise<void>
  refreshConnection: () => Promise<void>
}

const defaultConnection: AmoConnection = {
  connected: false,
  domain: null,
  lastSyncAt: null,
  leadsCount: 0,
  managersCount: 0,
}

const mockData: AmoData = {
  pipelines: mockPipelines,
  managers: mockManagers,
  stats: mockDashboardStats,
  alerts: mockAiAlerts,
  weeklyData: mockWeeklyData,
  activityData: mockDealsActivity,
}

const AmoContext = createContext<AmoContextValue>({
  connection: defaultConnection,
  data: mockData,
  isLoading: false,
  isSyncing: false,
  isDemo: true,
  sync: async () => {},
  disconnect: async () => {},
  refreshConnection: async () => {},
})

export function AmoProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<AmoConnection>(defaultConnection)
  const [data, setData] = useState<AmoData>(mockData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Check connection status on mount
  const refreshConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/amo/status")
      if (!res.ok) {
        setConnection(defaultConnection)
        return
      }
      const status: AmoConnection = await res.json()
      setConnection(status)
    } catch {
      setConnection(defaultConnection)
    }
  }, [])

  // Full sync: fetch all data from AmoCRM and transform
  const sync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/amo/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")

      const result = await res.json()

      if (result.data) {
        setData({
          pipelines: result.data.pipelines || mockPipelines,
          managers: result.data.managers || mockManagers,
          stats: result.data.stats || mockDashboardStats,
          alerts: result.data.alerts || mockAiAlerts,
          weeklyData: result.data.weeklyData || mockWeeklyData,
          activityData: result.data.activityData || mockDealsActivity,
        })

        setConnection((prev) => ({
          ...prev,
          connected: true,
          lastSyncAt: new Date().toISOString(),
          leadsCount: result.stats?.leads || 0,
          managersCount: result.stats?.managers || 0,
        }))
      }
    } catch (err) {
      console.error("Sync error:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await fetch("/api/amo/disconnect", { method: "POST" })
    setConnection(defaultConnection)
    setData(mockData)
  }, [])

  // On mount: check connection, then sync if connected
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await refreshConnection()
      setIsLoading(false)
    }
    init()
  }, [refreshConnection])

  // Auto-sync when connection is detected
  useEffect(() => {
    if (connection.connected) {
      sync()
    }
  }, [connection.connected, sync])

  const isDemo = !connection.connected

  return (
    <AmoContext.Provider value={{
      connection,
      data,
      isLoading,
      isSyncing,
      isDemo,
      sync,
      disconnect,
      refreshConnection,
    }}>
      {children}
    </AmoContext.Provider>
  )
}

export function useAmo() {
  return useContext(AmoContext)
}
