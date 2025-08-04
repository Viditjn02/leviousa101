"use client"
import React, { createContext, useContext } from 'react'
import { AuthenticatedConnectUser } from '@useparagon/connect'
import useParagonAuth from '../hooks/useParagonAuth'

interface ParagonAuthContextShape {
  user?: AuthenticatedConnectUser
  error?: Error
  isLoading: boolean
}

const ParagonAuthContext = createContext<ParagonAuthContextShape | undefined>(undefined)

interface ProviderProps {
  children: React.ReactNode
  userId?: string
}

export function ParagonAuthProvider({ children, userId }: ProviderProps) {
  const { user, error, isLoading } = useParagonAuth(userId)

  return (
    <ParagonAuthContext.Provider value={{ user, error, isLoading }}>
      {children}
    </ParagonAuthContext.Provider>
  )
}

export function useParagonAuthContext() {
  const ctx = useContext(ParagonAuthContext)
  if (!ctx) throw new Error('useParagonAuthContext must be used within ParagonAuthProvider')
  return ctx
}
