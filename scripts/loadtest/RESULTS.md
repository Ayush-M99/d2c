# WebSocket fanout load test — results

Harness: [`fanout-load.mjs`](./fanout-load.mjs). Raw JSON per run in [`results/`](./results).

## What is being measured

End-to-end delivery latency of the production hot path, timed on the client:

```
client emit send_message
  -> gateway handleSendMessage (auth + room membership check)
  -> MessageHandler: inline filter -> Redis rate limit -> XADD to Redis Stream -> XTRIM
  -> FanoutPublisher: Redis PUBLISH thread:{id}:messages (+ async Kafka produce)
  -> RedisFanout PSUBSCRIBE thread:*:messages
  -> io.to(`thread:{id}`).emit('new_message')
  -> every subscribed client receives
```

The sender stamps `Date.now()` into the message body; every receiver subtracts it on
arrival. Sender and receivers share one process, so the clock is identical on both ends
and the reported number is a true round trip including Socket.IO framing — not a
server-internal timer.

Sessions and threads are seeded directly into Redis with the production
`SessionManager` / `ThreadManager`, so the HTTP bootstrap limiter (60 req/min/IP) does
not distort the WebSocket measurement. Every other server-side guard stays on: session
auth on the Socket.IO handshake, room membership check, inline content filter, and the
1/s + 5-per-3s message rate limit.

## Environment

| | |
|---|---|
| CPU | Intel Core Ultra 9 275HX, 24 logical cores |
| RAM | 31.4 GB |
| Node | v24.18.0 |
| Gateway | single Node process, `packages/gateway/dist/server.js` |
| Infra | Docker Compose: Redis 7, PostGIS 16-3.4, Kafka 7.5.0 + Zookeeper |
| Topology | gateway, harness, and infra all on one host (loopback) |

Load generators and the server under test share the host, so measured latency includes
client-side scheduling — the numbers are conservative for the server.

## Results

Each run: 30 s steady state, senders capped at 1 msg/s to respect the server rate limit,
4 s warm-up discarded (first publish pays Kafka topic metadata + V8 tiering costs).

| Concurrent conns | Harness procs | Deliveries | Delivered | p50 | p95 | p99 | max | Aggregate |
|---|---|---|---|---|---|---|---|---|
| 500 | 1 | 72,500 | 100% | 26 ms | 41 ms | 46 ms | 53 ms | 2,417/s |
| 1,000 | 1 | 145,000 | 100% | 44 ms | 77 ms | 88 ms | 101 ms | 4,833/s |
| 2,000 | 1 | 232,000 | 100% | 72 ms | 124 ms | 139 ms | 157 ms | 7,733/s |
| 2,000 | 2 | 290,000 | 100% | 39–41 ms | 70–72 ms | 78–81 ms | 89 ms | 9,667/s |
| 3,000 | 3 | 435,000 | 100% | 41–44 ms | 74–78 ms | 87–90 ms | 111 ms | 14,500/s |
| **5,000** | **5** | **725,000** | **100%** | **41–45 ms** | **72–74 ms** | **80–90 ms** | **114 ms** | **24,167/s** |
| 8,000 | 8 | 1,160,000 | 100% | 41–80 ms | 71–155 ms | 80–187 ms | 202 ms | 38,667/s |

Zero connect errors and zero mid-run disconnects at every tier. Zero rate-limit
rejections — senders stayed inside the 1/s budget by design.

### Reading the 2,000-connection rows

The single-process run at 2,000 shows p95 124 ms; splitting the *same* 2,000 server-side
connections across two harness processes drops p95 to ~71 ms while pushing *more*
aggregate load (9,667/s vs 7,733/s). The extra latency was the load generator, not the
gateway. All tiers of 3,000+ therefore use one harness process per 1,000 connections.

At 8,000 the spread widens (three of eight processes report p95 121–155 ms) because
eight generator processes plus the gateway start contending for cores. Delivery
correctness held at 100%, so this is a harness ceiling, not a server failure.

### Gateway resource use at 5,000 connections

| | |
|---|---|
| RSS | 531 MB |
| CPU | ~0.35 of one core (≈10 CPU-seconds per 30 s wall) |
| OS handles | 5,270 |

Sustaining 24,167 deliveries/s at roughly a third of a single core is the expected shape
for this design: Socket.IO encodes each frame once per room and reuses it per socket, and
the gateway never holds thread state — it is a pass-through between Redis Pub/Sub and
the room's sockets.

## Reproducing

```powershell
docker compose up -d
pnpm --filter @chatspaces/gateway build
$env:REDIS_URL='redis://localhost:6379'
$env:DATABASE_URL='postgresql://chatspaces:chatspaces_dev@localhost:5432/chatspaces'
$env:KAFKA_BROKERS='localhost:9092'
node packages/gateway/dist/server.js
```

Then, in another shell — one process per 1,000 connections:

```powershell
$env:CLIENTS='1000'; $env:THREADS='3'; $env:DURATION_S='30'; $env:LABEL='run1'
node --max-old-space-size=4096 scripts/loadtest/fanout-load.mjs
```

`THREADS` must keep each thread under the 500-user cap (`LIMITS.THREAD_MAX_USERS`).

## Caveats

- Single host, loopback network. No real-world RTT, TLS, or proxy hop.
- One gateway process. Horizontal scale-out across gateway pods is supported by the
  design (Redis Pub/Sub fanout, no in-process thread state) but was not measured here.
- Publish rate is capped by the server's own 1 msg/s per session×thread limit, so these
  runs stress fanout width (deliveries/s), not write-path depth.
- Kafka runs in the loop as configured — the produce is fire-and-forget, so a slow broker
  does not appear in these latencies by design.
