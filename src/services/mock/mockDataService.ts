import type { DataService } from '../types'
import { userDataRepository as repo } from './repository'
import { latency } from './storage'

export const mockDataService: DataService = {
  async load(userId) {
    return latency(repo.load(userId), 60)
  },
  async resetDemo(userId) {
    repo.reset(userId)
    return latency(undefined, 300)
  },
  async clearMovements(userId) {
    repo.mutate(userId, (data) => {
      const now = new Date().toISOString()
      for (const tx of data.transactions) if (!tx.deletedAt) tx.deletedAt = now
    })
    return latency(undefined, 250)
  },
  async exportJSON(userId) {
    return latency(JSON.stringify(repo.load(userId), null, 2), 120)
  },
}
