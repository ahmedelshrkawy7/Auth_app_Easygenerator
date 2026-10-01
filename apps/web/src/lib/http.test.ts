import { http as mock, HttpResponse } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"
import { server } from "@/test/server"
import { unauthorized } from "@/test/handlers"
import { http, setSessionExpiredHandler } from "./http"

/** /api/data returns 401 until the session has been refreshed. */
function useExpiringSession({ refreshOk = true } = {}) {
  let refreshed = false
  const calls = { refresh: 0, data: 0 }
  server.use(
    mock.post("/api/auth/refresh", async () => {
      calls.refresh++
      await new Promise((r) => setTimeout(r, 20)) // let concurrent 401s pile up
      if (!refreshOk) return unauthorized()
      refreshed = true
      return new HttpResponse(null, { status: 204 })
    }),
    mock.get("/api/data", () => {
      calls.data++
      return refreshed ? HttpResponse.json({ ok: true }) : unauthorized()
    })
  )
  return calls
}

afterEach(() => setSessionExpiredHandler(() => {}))

describe("http refresh interceptor", () => {
  it("refreshes once on 401 and retries the request", async () => {
    const calls = useExpiringSession()

    const res = await http.get("/data")

    expect(res.data).toEqual({ ok: true })
    expect(calls).toEqual({ refresh: 1, data: 2 })
  })

  it("shares one refresh call between concurrent 401s", async () => {
    const calls = useExpiringSession()

    const results = await Promise.all([
      http.get("/data"),
      http.get("/data"),
      http.get("/data"),
    ])

    expect(results.map((r) => r.data)).toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
    ])
    expect(calls.refresh).toBe(1)
  })

  it("calls the session-expired handler and rejects when the refresh fails", async () => {
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    const calls = useExpiringSession({ refreshOk: false })

    await expect(http.get("/data")).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(onExpired).toHaveBeenCalledOnce()
    expect(calls).toEqual({ refresh: 1, data: 1 })
  })

  it("does not refresh for requests that opt out", async () => {
    const calls = useExpiringSession()

    await expect(
      http.get("/data", { skipAuthRefresh: true })
    ).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(calls.refresh).toBe(0)
  })

  it("does not loop when the retried request is still 401", async () => {
    let refreshCalls = 0
    server.use(
      mock.post("/api/auth/refresh", () => {
        refreshCalls++
        return new HttpResponse(null, { status: 204 })
      }),
      mock.get("/api/data", unauthorized)
    )

    await expect(http.get("/data")).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(refreshCalls).toBe(1)
  })

  it("passes non-401 errors through untouched", async () => {
    server.use(
      mock.get("/api/data", () => new HttpResponse(null, { status: 500 }))
    )

    await expect(http.get("/data")).rejects.toMatchObject({
      response: { status: 500 },
    })
  })
})
