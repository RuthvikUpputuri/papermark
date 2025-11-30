import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RedisAdapter, createRedisClient } from "./redis-adapter";

type RedisKey = string;

type Expiry = number | undefined;

type SortedSetEntry = {
  score: number;
  member: string;
};

type RedisValueEntry =
  | {
      type: "string";
      value: string;
      expiresAt?: Expiry;
    }
  | {
      type: "set";
      value: Set<string>;
      expiresAt?: Expiry;
    }
  | {
      type: "zset";
      value: Map<string, SortedSetEntry>;
      expiresAt?: Expiry;
    }
  | {
      type: "hash";
      value: Map<string, string>;
      expiresAt?: Expiry;
    };

class MemoryRedis {
  private store = new Map<RedisKey, RedisValueEntry>();

  private getEntry(key: RedisKey): RedisValueEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  private setEntry(key: RedisKey, entry: RedisValueEntry) {
    this.store.set(key, entry);
  }

  private resolveExpiration(opts?: { ex?: number; px?: number; pxat?: number }):
    | Expiry {
    if (!opts) return undefined;
    const now = Date.now();
    if (typeof opts.pxat === "number") return opts.pxat;
    if (typeof opts.px === "number") return now + opts.px;
    if (typeof opts.ex === "number") return now + opts.ex * 1000;
    return undefined;
  }

  async get<T extends string = string>(key: RedisKey): Promise<T | null> {
    const entry = this.getEntry(key);
    if (!entry || entry.type !== "string") return null;
    return entry.value as T;
  }

  async set(
    key: RedisKey,
    value: string,
    options?: { ex?: number; px?: number; pxat?: number; nx?: boolean },
  ): Promise<string | null> {
    const existing = this.getEntry(key);
    if (options?.nx && existing) return null;
    const expiresAt = this.resolveExpiration(options);
    this.setEntry(key, { type: "string", value, expiresAt });
    return "OK";
  }

  async setex(key: RedisKey, seconds: number, value: string) {
    return this.set(key, value, { ex: seconds });
  }

  async del(...keys: RedisKey[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
    }
    return removed;
  }

  async incr(key: RedisKey): Promise<number> {
    const entry = this.getEntry(key);
    let current = 0;
    if (entry && entry.type === "string") {
      const parsed = Number(entry.value);
      if (!Number.isNaN(parsed)) current = parsed;
    }
    current += 1;
    this.setEntry(key, {
      type: "string",
      value: String(current),
      expiresAt: entry?.expiresAt,
    });
    return current;
  }

  async expire(key: RedisKey, seconds: number): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    this.setEntry(key, entry);
    return 1;
  }

  async sadd(key: RedisKey, ...members: string[]): Promise<number> {
    const existing = this.getEntry(key);
    let set: Set<string>;
    if (existing && existing.type === "set") {
      set = existing.value;
    } else {
      set = new Set();
    }
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added += 1;
      }
    }
    this.setEntry(key, {
      type: "set",
      value: set,
      expiresAt: existing?.expiresAt,
    });
    return added;
  }

  async srem(key: RedisKey, ...members: string[]): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry || entry.type !== "set") return 0;
    let removed = 0;
    for (const member of members) {
      if (entry.value.delete(member)) removed += 1;
    }
    return removed;
  }

  async sismember(key: RedisKey, member: string): Promise<boolean> {
    const entry = this.getEntry(key);
    if (!entry || entry.type !== "set") return false;
    return entry.value.has(member);
  }

  async zadd(key: RedisKey, member: SortedSetEntry | SortedSetEntry[]) {
    const existing = this.getEntry(key);
    const map =
      existing && existing.type === "zset"
        ? existing.value
        : new Map<string, SortedSetEntry>();
    const entries = Array.isArray(member) ? member : [member];
    for (const entry of entries) {
      map.set(entry.member, entry);
    }
    this.setEntry(key, {
      type: "zset",
      value: map,
      expiresAt: existing?.expiresAt,
    });
    return entries.length;
  }

  async zrange(
    key: RedisKey,
    start: number,
    stop: number,
    options?: { rev?: boolean; byScore?: boolean },
  ): Promise<string[]> {
    const entry = this.getEntry(key);
    if (!entry || entry.type !== "zset") return [];
    const values = Array.from(entry.value.values());
    const sorted = values.sort((a, b) => a.score - b.score);

    if (options?.byScore) {
      const min = start;
      const max = stop;
      const filtered = sorted.filter(
        (item) => item.score >= min && item.score <= max,
      );
      const result = options?.rev ? filtered.reverse() : filtered;
      return result.map((item) => item.member);
    }

    const ordered = options?.rev ? [...sorted].reverse() : sorted;
    const normalizedStop = stop < 0 ? ordered.length + stop : stop;
    const slice = ordered.slice(start, normalizedStop + 1);
    return slice.map((item) => item.member);
  }

  async zrem(key: RedisKey, member: string): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry || entry.type !== "zset") return 0;
    return entry.value.delete(member) ? 1 : 0;
  }

  async hincrby(key: RedisKey, field: string, increment: number): Promise<number> {
    const existing = this.getEntry(key);
    const hash =
      existing && existing.type === "hash"
        ? existing.value
        : new Map<string, string>();
    
    const currentValue = hash.get(field);
    const current = currentValue ? parseInt(currentValue, 10) : 0;
    const newValue = current + increment;
    
    hash.set(field, String(newValue));
    this.setEntry(key, {
      type: "hash",
      value: hash,
      expiresAt: existing?.expiresAt,
    });
    return newValue;
  }

  async hset(key: RedisKey, field: string | Record<string, any>, value?: any): Promise<number> {
    const existing = this.getEntry(key);
    const hash =
      existing && existing.type === "hash"
        ? existing.value
        : new Map<string, string>();
    
    let fieldsSet = 0;
    
    if (typeof field === "string" && value !== undefined) {
      // Single field-value pair
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      if (!hash.has(field)) fieldsSet = 1;
      hash.set(field, stringValue);
    } else if (typeof field === "object") {
      // Multiple field-value pairs
      for (const [f, v] of Object.entries(field)) {
        const stringValue = typeof v === "string" ? v : JSON.stringify(v);
        if (!hash.has(f)) fieldsSet += 1;
        hash.set(f, stringValue);
      }
    }
    
    this.setEntry(key, {
      type: "hash",
      value: hash,
      expiresAt: existing?.expiresAt,
    });
    return fieldsSet;
  }
}

const hasUpstashRedis =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const hasLockerRedis =
  Boolean(process.env.UPSTASH_REDIS_REST_LOCKER_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN);

// Check for self-hosted Redis
const hasSelfHostedRedis =
  Boolean(process.env.REDIS_URL) || Boolean(process.env.REDIS_HOST);

const hasSelfHostedLockerRedis =
  Boolean(process.env.REDIS_LOCKER_URL) || Boolean(process.env.REDIS_LOCKER_HOST);

const fallbackRedis = new MemoryRedis();

// Prioritize self-hosted Redis over Upstash
export const redis: Redis = hasSelfHostedRedis
  ? (createRedisClient("REDIS") as unknown as Redis)
  : hasUpstashRedis
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL as string,
        token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
      })
    : (fallbackRedis as unknown as Redis);

export const lockerRedisClient: Redis = hasSelfHostedLockerRedis
  ? (createRedisClient("REDIS_LOCKER") as unknown as Redis)
  : hasLockerRedis
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_LOCKER_URL as string,
        token: process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN as string,
      })
    : (fallbackRedis as unknown as Redis);

const windowToMs = (value: string): number => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) return 1000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 1000);
};

class InMemoryRateLimiter {
  private counters = new Map<string, { count: number; resetAt: number }>();

  constructor(private limitValue: number, private windowMs: number) {}

  async limit(identifier: string) {
    const now = Date.now();
    const entry = this.counters.get(identifier);

    if (!entry || now >= entry.resetAt) {
      this.counters.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        success: true,
        pending: 0,
        limit: this.limitValue,
        remaining: this.limitValue - 1,
        reset: now + this.windowMs,
      };
    }

    if (entry.count >= this.limitValue) {
      return {
        success: false,
        pending: 0,
        limit: this.limitValue,
        remaining: 0,
        reset: entry.resetAt,
      };
    }

    entry.count += 1;
    this.counters.set(identifier, entry);

    return {
      success: true,
      pending: 0,
      limit: this.limitValue,
      remaining: Math.max(this.limitValue - entry.count, 0),
      reset: entry.resetAt,
    };
  }
}

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  if (hasSelfHostedRedis || hasUpstashRedis) {
    return new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(requests, seconds),
      analytics: true,
      prefix: "papermark",
    });
  }

  const windowMs = windowToMs(seconds);
  return new InMemoryRateLimiter(requests, windowMs) as unknown as Ratelimit;
};
