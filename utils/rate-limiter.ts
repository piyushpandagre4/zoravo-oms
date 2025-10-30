interface TokenBucket {
  tokens: number
  lastRefill: number
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private readonly capacity: number
  private readonly refillRate: number
  private readonly refillInterval: number

  constructor(capacity: number = 10, refillRate: number = 1, refillIntervalMs: number = 1000) {
    this.capacity = capacity
    this.refillRate = refillRate
    this.refillInterval = refillIntervalMs
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now()
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = Math.floor(timePassed / this.refillInterval) * this.refillRate
    
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key)
    
    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: Date.now()
      }
      this.buckets.set(key, bucket)
    }
    
    this.refillBucket(bucket)
    return bucket
  }

  public isAllowed(key: string): boolean {
    const bucket = this.getBucket(key)
    
    if (bucket.tokens > 0) {
      bucket.tokens--
      return true
    }
    
    return false
  }

  public getRemainingTokens(key: string): number {
    const bucket = this.getBucket(key)
    return bucket.tokens
  }

  public getResetTime(key: string): number {
    const bucket = this.getBucket(key)
    return bucket.lastRefill + this.refillInterval
  }

  // Clean up old buckets to prevent memory leaks
  public cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1 hour
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key)
      }
    }
  }
}

// Export rate limiter instance
export const exportRateLimiter = new RateLimiter(
  5,    // 5 requests
  1,    // 1 token per second
  1000  // refill every second
)

// Clean up old buckets every 5 minutes
setInterval(() => {
  exportRateLimiter.cleanup()
}, 5 * 60 * 1000)

export { RateLimiter }
