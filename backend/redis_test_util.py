"""
Test script for Redis caching functionality.
"""

import asyncio
import sys

sys.path.insert(0, "/home/ubuntu-desk/Desktop/Teleradiology/geteway/backend")

from app.cache.service import cache_service


async def test_cache():
    print("=" * 60)
    print("Testing Redis Cache Service")
    print("=" * 60)

    # Print configuration
    from app.config import get_settings

    settings = get_settings()
    print(f"\nRedis URL from config: {settings.redis_url}")

    # Test 1: Connect to Redis
    print("\n[TEST 1] Connecting to Redis...")
    try:
        await cache_service.connect()
        print("✓ Successfully connected to Redis")
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return False

    # Test 2: Set a simple string value
    print("\n[TEST 2] Setting a string value...")
    try:
        await cache_service.set("test:string", "Hello Redis!", expire=60)
        print("✓ Successfully set string value")
    except Exception as e:
        print(f"✗ Failed to set value: {e}")
        return False

    # Test 3: Get the string value
    print("\n[TEST 3] Getting the string value...")
    try:
        value = await cache_service.get("test:string")
        if value == "Hello Redis!":
            print(f"✓ Successfully retrieved value: {value}")
        else:
            print(f"✗ Retrieved unexpected value: {value}")
            return False
    except Exception as e:
        print(f"✗ Failed to get value: {e}")
        return False

    # Test 4: Set a dict/JSON value
    print("\n[TEST 4] Setting a JSON value...")
    try:
        test_data = {"user": "john", "role": "admin", "permissions": ["read", "write"]}
        await cache_service.set("test:json", test_data, expire=60)
        print("✓ Successfully set JSON value")
    except Exception as e:
        print(f"✗ Failed to set JSON: {e}")
        return False

    # Test 5: Get the JSON value
    print("\n[TEST 5] Getting the JSON value...")
    try:
        value = await cache_service.get("test:json")
        if value == test_data:
            print(f"✓ Successfully retrieved JSON: {value}")
        else:
            print(f"✗ Retrieved unexpected JSON: {value}")
            return False
    except Exception as e:
        print(f"✗ Failed to get JSON: {e}")
        return False

    # Test 6: Delete a key
    print("\n[TEST 6] Deleting a key...")
    try:
        await cache_service.delete("test:string")
        value = await cache_service.get("test:string")
        if value is None:
            print("✓ Successfully deleted key")
        else:
            print(f"✗ Key still exists with value: {value}")
            return False
    except Exception as e:
        print(f"✗ Failed to delete key: {e}")
        return False

    # Test 7: Clear prefix
    print("\n[TEST 7] Testing prefix clearing...")
    try:
        await cache_service.set("test:prefix:1", "value1", expire=60)
        await cache_service.set("test:prefix:2", "value2", expire=60)
        await cache_service.set("test:prefix:3", "value3", expire=60)
        print("  Set 3 keys with 'test:prefix:' prefix")

        await cache_service.clear_prefix("test:prefix:")
        print("  Cleared all keys with prefix")

        val1 = await cache_service.get("test:prefix:1")
        val2 = await cache_service.get("test:prefix:2")
        val3 = await cache_service.get("test:prefix:3")

        if val1 is None and val2 is None and val3 is None:
            print("✓ Successfully cleared all prefixed keys")
        else:
            print(f"✗ Some keys still exist: {val1}, {val2}, {val3}")
            return False
    except Exception as e:
        print(f"✗ Failed prefix test: {e}")
        return False

    # Cleanup
    print("\n[CLEANUP] Cleaning up test keys...")
    try:
        await cache_service.delete("test:json")
        await cache_service.close()
        print("✓ Cleanup complete, connection closed")
    except Exception as e:
        print(f"✗ Cleanup failed: {e}")

    print("\n" + "=" * 60)
    print("ALL CACHE TESTS PASSED ✓")
    print("=" * 60)
    return True


if __name__ == "__main__":
    result = asyncio.run(test_cache())
    sys.exit(0 if result else 1)
