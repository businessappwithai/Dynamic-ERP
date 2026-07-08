"""SSE endpoint streaming real-time gateway activity (action dispatches).

Requires only a valid token (any scope) — this is a read/observe capability
distinct from the action-invoke path, so it does not gate on
``JWT_REQUIRED_SCOPE`` the way ``/api/v1/actions/*`` does.
"""
import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.auth.jwt import Principal, verify_token
from app.events.bus import event_bus

router = APIRouter()

_PING_INTERVAL_S = 15.0


def _format_sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@router.get("/api/v1/events")
async def stream_events(
    request: Request,
    _: Principal = Depends(verify_token),
) -> StreamingResponse:
    sub_id, queue = event_bus.subscribe()

    async def _generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=_PING_INTERVAL_S)
                except asyncio.TimeoutError:
                    yield _format_sse("ping", {})
                    continue
                yield _format_sse(event["type"], event)
        finally:
            event_bus.unsubscribe(sub_id)

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
