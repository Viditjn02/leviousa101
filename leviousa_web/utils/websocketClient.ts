/**
 * WebSocket Client for Paragon Integration Notifications
 * Replaces localhost:9001 HTTP communication with WebSocket
 */

interface NotificationMessage {
  serviceKey: string
  status: string
  error?: string
  timestamp?: string
}

interface WebSocketResponse {
  success: boolean
  message?: string
  error?: string
  serviceKey?: string
}

class ParagonWebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second
  private isConnecting = false
  private messageQueue: NotificationMessage[] = []
  
  constructor(private url: string = 'ws://127.0.0.1:9001/ws') {
    console.log('[WebSocketClient] 🔌 Initialized for URL:', this.url)
  }

  /**
   * Send notification to Electron app via WebSocket
   * This replaces the HTTP POST to localhost:9001/api/auth/notify-completion
   */
  async sendNotification(notification: NotificationMessage): Promise<WebSocketResponse> {
    return new Promise((resolve, reject) => {
      // Add timestamp if not provided
      if (!notification.timestamp) {
        notification.timestamp = new Date().toISOString()
      }

      console.log('[WebSocketClient] 📨 Sending notification:', notification)

      // If not connected, try to connect first
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('[WebSocketClient] 🔄 WebSocket not connected, attempting connection...')
        this.connect().then(() => {
          this.sendMessage(notification, resolve, reject)
        }).catch(() => {
          // If WebSocket fails, we'll let the caller handle the fallback
          reject(new Error('WebSocket connection failed'))
        })
        return
      }

      this.sendMessage(notification, resolve, reject)
    })
  }

  private sendMessage(
    notification: NotificationMessage, 
    resolve: (value: WebSocketResponse) => void,
    reject: (reason?: any) => void
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not available'))
      return
    }

    // Set up one-time response listener
    const responseTimeout = setTimeout(() => {
      reject(new Error('WebSocket response timeout'))
    }, 5000) // 5 second timeout

    const handleResponse = (event: MessageEvent) => {
      try {
        const response: WebSocketResponse = JSON.parse(event.data)
        console.log('[WebSocketClient] 📬 Received response:', response)
        
        clearTimeout(responseTimeout)
        this.ws?.removeEventListener('message', handleResponse)
        
        if (response.success) {
          resolve(response)
        } else {
          reject(new Error(response.error || 'WebSocket request failed'))
        }
      } catch (error) {
        clearTimeout(responseTimeout)
        this.ws?.removeEventListener('message', handleResponse)
        reject(new Error('Invalid WebSocket response'))
      }
    }

    this.ws.addEventListener('message', handleResponse)
    this.ws.send(JSON.stringify(notification))
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('[WebSocketClient] ⏳ Connection already in progress')
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        console.log(`[WebSocketClient] 🔄 Connecting to ${this.url}...`)
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('[WebSocketClient] ✅ WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          resolve()
        }

        this.ws.onclose = (event) => {
          console.log(`[WebSocketClient] 🔌 WebSocket closed: ${event.code} ${event.reason}`)
          this.isConnecting = false
          this.ws = null
          
          // Auto-reconnect if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('[WebSocketClient] ❌ WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'connected') {
              console.log('[WebSocketClient] 🎉 Server welcome message:', message.message)
            }
          } catch (error) {
            console.warn('[WebSocketClient] ⚠️ Could not parse WebSocket message:', event.data)
          }
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`[WebSocketClient] 🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      this.connect().catch(() => {
        console.log('[WebSocketClient] ❌ Reconnection attempt failed')
      })
    }, delay)
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      console.log('[WebSocketClient] 🔌 Disconnecting WebSocket')
      this.ws.close(1000, 'Client requested disconnect')
      this.ws = null
    }
  }
}

// Singleton instance for the application
let instance: ParagonWebSocketClient | null = null

export function getParagonWebSocketClient(): ParagonWebSocketClient {
  if (!instance) {
    // Auto-detect the correct port based on environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (typeof window !== 'undefined' && (window as any).api?.getApiUrl?.()) ||
                   'ws://localhost:9001'
    
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
    instance = new ParagonWebSocketClient(wsUrl)
  }
  return instance
}

/**
 * Send Paragon integration notification via WebSocket
 * Direct replacement for the fetch() call to localhost:9001
 */
export async function notifyParagonAuthentication(
  serviceKey: string, 
  status: string, 
  error?: string
): Promise<WebSocketResponse> {
  const client = getParagonWebSocketClient()
  
  try {
    return await client.sendNotification({
      serviceKey,
      status,
      error,
      timestamp: new Date().toISOString()
    })
  } catch (wsError) {
    console.warn('[WebSocketClient] ⚠️ WebSocket notification failed, error:', wsError)
    throw wsError
  }
}
