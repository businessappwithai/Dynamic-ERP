"""Module provisioning — installs erpclaw expansion modules via the gateway.

Module lifecycle actions (``install-module``, ``list-modules``, ...) are
forwarded by erpclaw's own router (``scripts/db_query.py``'s
``MODULE_ACTIONS`` set) to ``module_manager.py``, but they're deliberately
excluded from the action catalog — ``build_catalog()`` skips anything outside
the router's domain ``ACTION_MAP`` since module actions don't belong to any
``erpclaw-*`` domain. This route dispatches them through the same
``tool_router.dispatch()`` that ``/api/v1/actions/{domain}/{action}`` uses,
just without the domain/catalog lookup that path requires — no new execution
path, no reimplementation of the confirmation gate.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.auth.jwt import Principal, require_invoke_scope
from app.erpclaw_bridge import loader as bridge_loader
from app.events.bus import event_bus

router = APIRouter()

_STATUS_TO_HTTP = {
    "ok": 200,
    "confirmation_required": 409,
}


class ProvisionRequest(BaseModel):
    module_name: str
    args: dict = Field(default_factory=dict)
    user_confirmed: bool = False


@router.post("/api/v1/modules/provision")
def provision_module(
    body: ProvisionRequest,
    principal: Principal = Depends(require_invoke_scope),
) -> JSONResponse:
    tool_router = bridge_loader.tool_router()
    result = tool_router.dispatch(
        "install-module",
        {"module_name": body.module_name, **body.args},
        body.user_confirmed,
    )

    status_value = result.get("status")
    http_status = _STATUS_TO_HTTP.get(status_value)
    if http_status is None:
        # Same convention as /api/v1/actions/*: a plain validation/business-rule
        # failure carries "message" -> 422; anything else -> 500.
        http_status = 422 if "message" in result else 500

    event_bus.publish(
        "module.provisioned",
        {
            "module_name": body.module_name,
            "status": status_value,
            "http_status": http_status,
            "user": principal.subject,
        },
    )

    return JSONResponse(status_code=http_status, content=result)
