/**
 * Redis Adapter for Self-Hosted Redis
 * 
 * This adapter wraps the ioredis client to be compatible with Upstash Redis interface,
 * allowing the app to use self-hosted Redis instead of Upstash REST API.
 */

import Redis from "ioredis";

type RedisConfig = {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
};

/**
 * Creates a Redis client compatible with Upstash Redis interface
 */
export class RedisAdapter {
  private client: Redis;

  constructor(config: RedisConfig) {
    if (config.url) {
      // Parse redis:// URL
      this.client = new Redis(config.url);
    } else {
      this.client = new Redis({
        host: config.host || "localhost",
        port: config.port || 6379,
        password: config.password,
        db: config.db || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });
    }

    this.client.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });
  }

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    
    try {
      // Try to parse JSON if possible
      return JSON.parse(value) as T;
    } catch {
      // Return as string if not JSON
      return value as T;
    }
  }

  async set(
    key: string,
    value: string | number | object,
    options?: { ex?: number; px?: number; nx?: boolean; exat?: number; pxat?: number },
  ): Promise<string | null> {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    
    const args: (string | number)[] = [key, stringValue];
    
    if (options?.nx) {
      args.push("NX");
    }
    
    if (options?.ex) {
      args.push("EX", options.ex);
    } else if (options?.px) {
      args.push("PX", options.px);
    } else if (options?.exat) {
      args.push("EXAT", options.exat);
    } else if (options?.pxat) {
      args.push("PXAT", options.pxat);
    }
    
    const result = await this.client.set(...args as [string, string, ...any[]]);
    return result === "OK" ? "OK" : null;
  }

  async setex(key: string, seconds: number, value: string | object): Promise<string> {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    await this.client.setex(key, seconds, stringValue);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return await this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return await this.client.srem(key, ...members);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  async zadd(
    key: string,
    member: { score: number; member: string } | { score: number; member: string }[]
  ): Promise<number> {
    const entries = Array.isArray(member) ? member : [member];
    
    if (entries.length === 0) return 0;
    
    const args: (string | number)[] = [];
    for (const entry of entries) {
      args.push(entry.score, entry.member);
    }
    
    return await this.client.zadd(key, ...args as [number, string, ...any[]]);
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; byScore?: boolean; withScores?: boolean },
  ): Promise<string[]> {
    const args: (string | number)[] = [key, start, stop];
    
    if (options?.byScore) {
      args.push("BYSCORE");
    }
    
    if (options?.rev) {
      args.push("REV");
    }
    
    if (options?.withScores) {
      args.push("WITHSCORES");
    }
    
    return await this.client.zrange(...args as [string, number, number, ...any[]]);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return await this.client.zrem(key, ...members);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return await this.client.hincrby(key, field, increment);
  }

  async hset(key: string, field: string | Record<string, any>, value?: any): Promise<number> {
    if (typeof field === "string" && value !== undefined) {
      // Single field-value pair: hset(key, field, value)
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      return await this.client.hset(key, field, stringValue);
    } else if (typeof field === "object") {
      // Multiple field-value pairs: hset(key, { field1: value1, field2: value2 })
      const flatArgs: (string | number)[] = [];
      for (const [f, v] of Object.entries(field)) {
        flatArgs.push(f);
        flatArgs.push(typeof v === "string" ? v : JSON.stringify(v));
      }
      return await this.client.hset(key, ...flatArgs as [string, any, ...any[]]);
    }
    return 0;
  }

  async quit(): Promise<string> {
    await this.client.quit();
    return "OK";
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  /**
   * Execute a Lua script directly. Required for compatibility with Upstash rate limiter APIs.
   */
  async eval(
    script: string,
    keys: string[],
    args: (string | number)[] = [],
  ): Promise<any> {
    const numKeys = keys.length;
    const convertedArgs = args.map((value) => value.toString());
    return await this.client.eval(script, numKeys, ...keys, ...convertedArgs);
  }

  /**
   * Execute a cached Lua script by SHA.
   */
  async evalsha(
    sha: string,
    keys: string[],
    args: (string | number)[] = [],
  ): Promise<any> {
    const numKeys = keys.length;
    const convertedArgs = args.map((value) => value.toString());
    return await this.client.evalsha(sha, numKeys, ...keys, ...convertedArgs);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
}

/**
 * Creates a Redis client from environment variables
 */
export function createRedisClient(envPrefix: "REDIS" | "REDIS_LOCKER" = "REDIS"): RedisAdapter | null {
  const url = process.env[`${envPrefix}_URL`];
  const host = process.env[`${envPrefix}_HOST`];
  const port = process.env[`${envPrefix}_PORT`];
  const password = process.env[`${envPrefix}_PASSWORD`];
  const db = process.env[`${envPrefix}_DB`];

  // If no config provided, return null (will use in-memory fallback)
  if (!url && !host) {
    return null;
  }

  return new RedisAdapter({
    url,
    host,
    port: port ? parseInt(port, 10) : undefined,
    password,
    db: db ? parseInt(db, 10) : undefined,
  });
}
