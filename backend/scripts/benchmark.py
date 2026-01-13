
import asyncio
import time
import httpx
import statistics

API_URL = "http://localhost:8003/api/v1"

async def benchmark_endpoint(client, name, method, url, payload=None, iterations=50):
    times = []
    print(f"Benchmarking {name} ({iterations} iters)...")
    
    for _ in range(iterations):
        start = time.time()
        try:
            if method == "GET":
                resp = await client.get(url)
            elif method == "POST":
                resp = await client.post(url, json=payload)
            resp.raise_for_status()
            duration = (time.time() - start) * 1000 # ms
            times.append(duration)
        except Exception as e:
            print(f"Error: {e}")
            
    if not times:
        print(f"All requests failed for {name}")
        return

    avg = statistics.mean(times)
    p95 = statistics.quantiles(times, n=20)[18]  # 95th percentile
    print(f"  Avg: {avg:.2f}ms")
    print(f"  P95: {p95:.2f}ms")
    print(f"  Min: {min(times):.2f}ms")
    print(f"  Max: {max(times):.2f}ms")

async def create_test_user():
    # Only useful if running locally against a DB accessible via localhost
    # Or we can rely on existing users.
    pass

async def main():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Health Check (baseline)
        await benchmark_endpoint(client, "Health Check", "GET", f"http://localhost:8003/health")
        
        # Try to login with default credentials if they exist or creating one is too hard from outside
        # Assuming 'admin' 'admin' or similar, or just try to hit open endpoints if any.
        # But wait, we want to test DB pooling.
        # Let's try to hit a public endpoint that uses DB?
        # /api/v1/auth/limit might be rate limited but no DB?
        
        # Let's try to login
        print("\nAttempting login...")
        try:
            # Try a known user or a default one from seed data?
            # If no seed data, we might be out of luck for DB testing without creating one.
            # Let's rely on Health Check for now to prove server is UP.
            # And attempt login.
            login_data = {"username": "testuser", "password": "password", "grant_type": "password"} # OAuth2 form
            # Note: Content-Type: application/x-www-form-urlencoded
            resp = await client.post("http://localhost:8003/api/v1/auth/login", data=login_data)
            if resp.status_code == 200:
                token = resp.json()["access_token"]
                print("Login successful.")
                headers = {"Authorization": f"Bearer {token}"}
                async with httpx.AsyncClient(headers=headers, timeout=10.0) as auth_client:
                    await benchmark_endpoint(auth_client, "Upload Stats (Redis)", "GET", f"http://localhost:8003/api/v1/upload/stats")
                    await benchmark_endpoint(auth_client, "List Reports (Index)", "GET", f"http://localhost:8003/api/v1/reports")
            else:
                print(f"Login failed: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"Login exception: {e}")

if __name__ == "__main__":
    asyncio.run(main())
