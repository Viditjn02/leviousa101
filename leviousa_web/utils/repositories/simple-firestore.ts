// Simplified storage for development that works without complex Firestore setup
// This is a temporary solution to get the app working while we debug the real database

interface SimpleDoc {
  id: string
  [key: string]: any
}

// Simple in-memory storage that mimics basic database operations
class SimpleStorage {
  private data = new Map<string, Map<string, any>>()

  collection(name: string) {
    if (!this.data.has(name)) {
      this.data.set(name, new Map())
    }

    return {
      doc: (id: string) => ({
        set: async (data: any) => {
          const collection = this.data.get(name)!
          collection.set(id, { ...data, id })
          console.log(`📝 Simple Storage: Created ${id} in ${name}`)
          return data
        },
        get: async () => {
          const collection = this.data.get(name)!
          const doc = collection.get(id)
          return {
            exists: !!doc,
            data: () => doc
          }
        },
        update: async (updates: any) => {
          const collection = this.data.get(name)!
          const existing = collection.get(id) || {}
          const updated = { ...existing, ...updates }
          collection.set(id, updated)
          console.log(`✏️ Simple Storage: Updated ${id} in ${name}`)
          return updated
        }
      }),
      where: () => this.createQuery(name),
      orderBy: () => this.createQuery(name),
      limit: () => this.createQuery(name)
    }
  }

  private createQuery(collectionName: string) {
    const self = this
    return {
      where: () => self.createQuery(collectionName),
      orderBy: () => self.createQuery(collectionName),
      limit: () => self.createQuery(collectionName),
      get: async () => {
        const collection = self.data.get(collectionName)!
        const docs = Array.from(collection.values())
        console.log(`🔍 Simple Storage: Query ${collectionName}, found ${docs.length} docs`)
        return {
          empty: docs.length === 0,
          docs: docs.map(data => ({ data: () => data }))
        }
      }
    }
  }

  getStats() {
    const stats: any = {}
    this.data.forEach((collection, name) => {
      stats[name] = collection.size
    })
    return stats
  }
}

// Global simple storage instance
const simpleStorage = new SimpleStorage()

export function getSimpleFirestore() {
  console.log('🔧 Using simple storage for development')
  return simpleStorage
}
