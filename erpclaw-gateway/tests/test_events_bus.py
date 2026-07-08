import asyncio

from app.events.bus import EventBus


def test_publish_fans_out_to_all_subscribers():
    bus = EventBus()
    _, q1 = bus.subscribe()
    _, q2 = bus.subscribe()

    bus.publish("action.dispatched", {"domain": "gl", "action": "list-accounts"})

    for q in (q1, q2):
        event = q.get_nowait()
        assert event["type"] == "action.dispatched"
        assert event["domain"] == "gl"
        assert "timestamp" in event


def test_unsubscribe_stops_delivery():
    bus = EventBus()
    sub_id, q = bus.subscribe()
    bus.unsubscribe(sub_id)

    bus.publish("action.dispatched", {"domain": "gl", "action": "list-accounts"})

    assert q.empty()


def test_full_queue_drops_oldest_event():
    bus = EventBus()
    _, q = bus.subscribe()

    for i in range(150):
        bus.publish("action.dispatched", {"seq": i})

    assert q.qsize() <= 100
    # oldest events (low seq) were evicted; the most recent one survived
    drained = []
    while not q.empty():
        drained.append(q.get_nowait())
    assert drained[-1]["seq"] == 149
    assert drained[0]["seq"] > 0
