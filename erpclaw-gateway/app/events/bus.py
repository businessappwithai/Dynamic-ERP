"""In-process pub/sub backing the gateway's SSE ``/api/v1/events`` endpoint.

No external broker for v1 — the gateway is a single process with one dispatch
path (``routes/actions.py``), so an ``asyncio.Queue`` per connected client is
enough to fan out "an action was dispatched" notifications. A future
multi-worker deployment would swap this for Postgres LISTEN/NOTIFY or a real
broker without changing the route contract.
"""
import asyncio
import itertools
import time
from typing import Any

_MAX_QUEUE = 100  # per-subscriber backlog; a slow consumer drops old events, never blocks a publisher


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[int, "asyncio.Queue[dict]"] = {}
        self._next_id = itertools.count()

    def subscribe(self) -> tuple[int, "asyncio.Queue[dict]"]:
        sub_id = next(self._next_id)
        queue: "asyncio.Queue[dict]" = asyncio.Queue(maxsize=_MAX_QUEUE)
        self._subscribers[sub_id] = queue
        return sub_id, queue

    def unsubscribe(self, sub_id: int) -> None:
        self._subscribers.pop(sub_id, None)

    def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        event = {"type": event_type, "timestamp": time.time(), **payload}
        for queue in list(self._subscribers.values()):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Drop the oldest queued event rather than block the caller
                # (an in-flight action dispatch) on a slow/disconnected client.
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    pass


event_bus = EventBus()
