"""Redis cache service."""

import json
from typing import Any, Optional
import redis.asyncio as redis
from app.config import get_settings

class CacheService:
    def __init__(self):
        self.settings = get_settings()
        self.redis_url = self.settings.redis_url
        self._redis: Optional[redis.Redis] = None

    async def connect(self):
        """Connect to Redis."""
        if not self._redis and self.redis_url:
            self._redis = redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)

    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return None
            
        value = await self._redis.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def set(self, key: str, value: Any, expire: int = 3600):
        """Set value in cache."""
        if not self._redis:
            await self.connect()
            
        if not self._redis:
            return

        if isinstance(value, (dict, list)):
            value = json.dumps(value)
            
        await self._redis.set(key, value, ex=expire)

    async def delete(self, key: str):
        """Delete value from cache."""
        if not self._redis:
            await self.connect()
            
        if not self._redis:
            return

        await self._redis.delete(key)

    async def clear_prefix(self, prefix: str):
        """Clear all keys with prefix."""
        if not self._redis:
            await self.connect()
            
        if not self._redis:
            return
            
        keys = await self._redis.keys(f"{prefix}*")
        if keys:
            await self._redis.delete(*keys)

# Global cache instance
cache_service = CacheService()
