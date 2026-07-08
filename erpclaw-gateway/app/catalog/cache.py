"""Builds and caches the full catalog once at process startup.

Combines:
  - action -> domain, from the router's ACTION_MAP (introspect.py)
  - name / destructive / description, reused from erpclaw's own
    mcp/skill_reader.py (so the gateway can never disagree with the router's
    own confirmation gate about what's destructive)
  - input schema, derived via AST (introspect.py)
  - output schema, a documented generic passthrough (introspect.py)
"""
from functools import lru_cache

from app.erpclaw_bridge import loader as bridge_loader
from app.catalog import introspect


def _url_domain(domain_dir_name: str) -> str:
    """"erpclaw-selling" -> "selling" (the {domain} URL segment)."""
    prefix = "erpclaw-"
    return domain_dir_name[len(prefix):] if domain_dir_name.startswith(prefix) else domain_dir_name


@lru_cache(maxsize=1)
def build_catalog() -> dict:
    skill_reader = bridge_loader.skill_reader()
    action_map, aliases = introspect.action_domain_map()
    known = skill_reader.list_actions()  # [{name, destructive, description}], carve-out already excluded

    actions = []
    domains_seen: dict[str, dict] = {}
    for entry in known:
        name = entry["name"]
        domain_dir = action_map.get(name)
        if domain_dir is None:
            continue  # not in the router's static ACTION_MAP (e.g. module-only action); skip for v1
        url_domain = _url_domain(domain_dir)
        input_schema = introspect.action_input_schema(domain_dir, name)
        actions.append({
            "name": name,
            "domain": url_domain,
            "domain_dir": domain_dir,
            "kind": _classify(name),
            "description": entry["description"],
            "destructive": entry["destructive"],
            "input_schema": input_schema,
            "output_schema": introspect.OUTPUT_SCHEMA,
        })
        domains_seen.setdefault(url_domain, {"name": url_domain, "domain_dir": domain_dir, "action_count": 0})
        domains_seen[url_domain]["action_count"] += 1

    return {
        "version": "erpclaw-gateway/0.1.0",
        "action_count": len(actions),
        "domains": sorted(domains_seen.values(), key=lambda d: d["name"]),
        "actions": actions,
        "aliases": aliases,
    }


def _classify(name: str) -> str:
    if name.startswith(("list-", "get-", "search-", "find-", "describe-")):
        return "query"
    if name.startswith(("report", "trial-", "aging", "-report")) or "report" in name:
        return "report"
    return "mutation"


def find_action(domain: str, action: str) -> dict | None:
    catalog = build_catalog()
    for entry in catalog["actions"]:
        if entry["name"] == action and entry["domain"] == domain:
            return entry
    return None
