from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.auth.jwt import Principal, authorize_action, require_invoke_scope
from app.catalog.cache import find_action
from app.erpclaw_bridge import loader as bridge_loader
from app.events.bus import event_bus

router = APIRouter()


class ActionRequest(BaseModel):
    args: dict[str, Any] = Field(default_factory=dict)
    user_confirmed: bool = False


_STATUS_TO_HTTP = {
    "ok": 200,
    "confirmation_required": 409,
}


@router.post("/api/v1/actions/{domain}/{action}")
def run_action(
    domain: str,
    action: str,
    body: ActionRequest,
    principal: Principal = Depends(require_invoke_scope),
) -> dict:
    # Checked before the catalog lookup: credential/backup/master-key actions
    # are deliberately excluded from the catalog (erpclaw's own "not even
    # discoverable" MCP posture), so find_action() would otherwise 404 them
    # indistinguishably from a genuine typo. The gateway is an authenticated
    # HTTP API for operators, not an LLM-facing discovery surface, so a caller
    # who already knows the action name gets a clear refusal, not a bare 404.
    confirm = bridge_loader.confirm()
    if confirm.is_credential_carved_out(action):
        return JSONResponse(status_code=403, content=confirm.credential_refusal(action))

    entry = find_action(domain, action)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown action '{action}' under domain '{domain}'.",
        )

    authorize_action(principal, kind=entry["kind"], destructive=entry["destructive"])

    tool_router = bridge_loader.tool_router()
    result = tool_router.dispatch(action, body.args, body.user_confirmed)

    status_value = result.get("status")
    http_status = _STATUS_TO_HTTP.get(status_value)
    if http_status is None:
        # "error" from erpclaw's own response.err() carries "message" (a plain
        # validation/business-rule failure) -> 422. Anything else (unparseable
        # router output, subprocess spawn failure) -> 500.
        http_status = 422 if "message" in result else 500

    event_bus.publish(
        "action.dispatched",
        {
            "domain": domain,
            "action": action,
            "status": status_value,
            "http_status": http_status,
            "user": principal.subject,
        },
    )

    return JSONResponse(status_code=http_status, content=result)
