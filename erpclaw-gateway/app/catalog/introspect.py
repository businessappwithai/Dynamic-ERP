"""AST-based catalog builder.

erpclaw's action handlers are plain argparse functions with no declared
per-action schema. Rather than hand-author ~488 schemas, this module derives
them the same way erpclaw's own ``mcp/skill_reader.py`` derives action names
and destructive flags: by parsing the source, never importing/executing the
(heavy, erpclaw_lib-dependent) domain modules.

Per-action input schema strategy (deliberately scoped down, see the plan):
  1. AST-parse each domain's ``main()`` for every ``parser.add_argument(...)``
     call -> a domain-wide flag registry (name, inferred JSON type, help).
  2. AST-parse the domain directory's ACTIONS / *_ACTIONS dict literals
     (across every .py file, not just db_query.py, since multi-file domains
     like erpclaw-accounting-adv split handlers into sibling files) to map
     action name -> handler function name.
  3. AST-walk the handler function's body for ``args.<name>`` / ``getattr(args,
     "<name>", ...)`` accesses, intersected against the flag registry, to get
     exactly the fields that action consumes.
  4. Required-vs-optional is deliberately NOT inferred (erpclaw enforces
     required-ness with runtime ``if not args.x: err(...)``, not
     ``argparse(required=True)`` — pattern-matching that is fragile). Every
     discovered field is marked optional; the schema's description says so.

Output schema is a documented generic passthrough (see catalog/cache.py) —
richer per-action output schemas are deferred.
"""
import ast
import os
from functools import lru_cache

from app.config import settings


def _scripts_dir() -> str:
    return os.path.join(settings.erpclaw_repo_root, "scripts")


def _router_path() -> str:
    return os.path.join(_scripts_dir(), "db_query.py")


def _parse(path: str) -> ast.Module | None:
    try:
        with open(path, "r") as f:
            return ast.parse(f.read(), filename=path)
    except (OSError, SyntaxError):
        return None


def _dict_literal_str_str(node: ast.Assign, names: set[str]) -> dict[str, str] | None:
    """If this assignment is `<name> = {...}` with `names` matching the target,
    and the dict maps string keys to ast.Name values, return {key: value.id}."""
    if not any(isinstance(t, ast.Name) and t.id in names for t in node.targets):
        return None
    if not isinstance(node.value, ast.Dict):
        return None
    out = {}
    for k, v in zip(node.value.keys, node.value.values):
        if isinstance(k, ast.Constant) and isinstance(k.value, str) and isinstance(v, ast.Name):
            out[k.value] = v.id
    return out


@lru_cache(maxsize=1)
def action_domain_map() -> tuple[dict[str, str], dict[str, str]]:
    """AST-parse the router's ACTION_MAP / ALIASES dict literals.

    Returns (action -> domain-dir-name e.g. "erpclaw-selling", alias -> canonical).
    """
    tree = _parse(_router_path())
    action_map: dict[str, str] = {}
    aliases: dict[str, str] = {}
    if tree is None:
        return action_map, aliases

    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        targets = [t.id for t in node.targets if isinstance(t, ast.Name)]
        if "ACTION_MAP" in targets and isinstance(node.value, ast.Dict):
            for k, v in zip(node.value.keys, node.value.values):
                if (isinstance(k, ast.Constant) and isinstance(k.value, str)
                        and isinstance(v, ast.Constant) and isinstance(v.value, str)):
                    action_map[k.value] = v.value
        elif "ALIASES" in targets and isinstance(node.value, ast.Dict):
            for k, v in zip(node.value.keys, node.value.values):
                if (isinstance(k, ast.Constant) and isinstance(k.value, str)
                        and isinstance(v, ast.Constant) and isinstance(v.value, str)):
                    aliases[k.value] = v.value
    return action_map, aliases


def _iter_domain_py_files(domain_dir: str):
    for root, dirs, files in os.walk(domain_dir):
        dirs[:] = [d for d in dirs if d not in ("__pycache__", "tests")]
        for f in files:
            if f.endswith(".py"):
                yield os.path.join(root, f)


def _infer_json_type(call: ast.Call) -> tuple[str, str | None]:
    """Infer a JSON-Schema type + note from an add_argument(...) call's kwargs."""
    kwargs = {kw.arg: kw.value for kw in call.keywords if kw.arg}
    action_kw = kwargs.get("action")
    if isinstance(action_kw, ast.Constant) and action_kw.value == "store_true":
        return "boolean", None
    type_kw = kwargs.get("type")
    if isinstance(type_kw, ast.Name) and type_kw.id == "int":
        return "integer", None
    if isinstance(type_kw, ast.Name) and type_kw.id == "float":
        return "number", None
    return "string", None


@lru_cache(maxsize=None)
def domain_flag_registry(domain_dir_name: str) -> dict[str, dict]:
    """Flag registry for one domain (e.g. "erpclaw-selling"): snake_name ->
    {flag, type, help, description}, extracted from every
    `parser.add_argument("--x", ...)` call anywhere in the domain's db_query.py
    (all actions in a domain share one argparse parser, so this is domain-wide,
    not per-action)."""
    domain_dir = os.path.join(_scripts_dir(), domain_dir_name)
    router_file = os.path.join(domain_dir, "db_query.py")
    tree = _parse(router_file)
    registry: dict[str, dict] = {}
    if tree is None:
        return registry

    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "add_argument"):
            continue
        if not node.args or not isinstance(node.args[0], ast.Constant):
            continue
        flag = node.args[0].value
        if not isinstance(flag, str) or not flag.startswith("--"):
            continue
        # dest defaults to flag name with '-' -> '_', unless dest= is explicit.
        dest = flag[2:].replace("-", "_")
        kwargs = {kw.arg: kw.value for kw in node.keywords if kw.arg}
        dest_kw = kwargs.get("dest")
        if isinstance(dest_kw, ast.Constant) and isinstance(dest_kw.value, str):
            dest = dest_kw.value
        if dest in ("action", "db_path"):
            continue  # routing/plumbing flags, not action payload fields
        help_kw = kwargs.get("help")
        help_text = help_kw.value if isinstance(help_kw, ast.Constant) and isinstance(help_kw.value, str) else ""
        json_type, note = _infer_json_type(node)
        description = help_text
        if dest in ("items",) or flag.endswith("-json"):
            description = (description + " JSON-encoded array/object." if description
                            else "JSON-encoded array/object.")
        registry[dest] = {"flag": flag, "type": json_type, "description": description}
    return registry


@lru_cache(maxsize=None)
def domain_action_handlers(domain_dir_name: str) -> dict[str, str]:
    """action-name -> handler-function-name, from every ACTIONS / *_ACTIONS
    dict literal across every .py file in the domain dir (handles multi-file
    domains like erpclaw-accounting-adv where ACTIONS is built via
    `ACTIONS.update(REVENUE_ACTIONS)` and REVENUE_ACTIONS is defined in a
    sibling file)."""
    domain_dir = os.path.join(_scripts_dir(), domain_dir_name)
    handlers: dict[str, str] = {}
    action_dict_names = set()
    for path in _iter_domain_py_files(domain_dir):
        tree = _parse(path)
        if tree is None:
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                targets = [t.id for t in node.targets if isinstance(t, ast.Name)]
                for name in targets:
                    if name == "ACTIONS" or name.endswith("_ACTIONS"):
                        action_dict_names.add(name)
                mapping = _dict_literal_str_str(node, {t for t in targets if t == "ACTIONS" or t.endswith("_ACTIONS")})
                if mapping:
                    handlers.update(mapping)
    return handlers


@lru_cache(maxsize=None)
def domain_functions(domain_dir_name: str) -> dict[str, ast.FunctionDef]:
    """function-name -> ast.FunctionDef, across every .py file in the domain dir."""
    domain_dir = os.path.join(_scripts_dir(), domain_dir_name)
    functions: dict[str, ast.FunctionDef] = {}
    for path in _iter_domain_py_files(domain_dir):
        tree = _parse(path)
        if tree is None:
            continue
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions[node.name] = node
    return functions


def _fields_accessed(func: ast.FunctionDef) -> set[str]:
    """Walk a handler function body for `args.<name>` and
    `getattr(args, "<name>", ...)`."""
    fields: set[str] = set()
    for node in ast.walk(func):
        if (isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name)
                and node.value.id == "args"):
            fields.add(node.attr)
        elif (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id == "getattr" and len(node.args) >= 2
                and isinstance(node.args[0], ast.Name) and node.args[0].id == "args"
                and isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str)):
            fields.add(node.args[1].value)
    return fields


def action_input_schema(domain_dir_name: str, action_name: str) -> dict:
    """Build a JSON-Schema `properties` object for one action."""
    handlers = domain_action_handlers(domain_dir_name)
    registry = domain_flag_registry(domain_dir_name)
    func_name = handlers.get(action_name)
    properties: dict[str, dict] = {}

    if func_name:
        functions = domain_functions(domain_dir_name)
        func = functions.get(func_name)
        if func is not None:
            for field in sorted(_fields_accessed(func)):
                if field in registry:
                    entry = registry[field]
                    prop = {"type": entry["type"]}
                    if entry["description"]:
                        prop["description"] = entry["description"]
                    properties[field] = prop

    return {
        "type": "object",
        "properties": properties,
        "required": [],
        "description": (
            "All fields are listed as optional here: erpclaw enforces "
            "required-ness at runtime (a missing required field returns "
            "{\"status\": \"error\", \"message\": \"--x is required\"}), not "
            "via schema validation. This schema is a best-effort field "
            "inventory derived from static analysis, not an authoritative "
            "contract — the server's response is authoritative."
        ),
    }


OUTPUT_SCHEMA = {
    "type": "object",
    "description": (
        "Verbatim JSON body from the erpclaw action. On success: "
        "{\"status\": \"ok\", ...action-specific fields...}. On error: "
        "{\"status\": \"error\", \"message\": str, \"suggestion\"?: str}. "
        "Inner success-payload fields vary per action and are not modeled "
        "in v1 (richer per-action output schemas are a later hardening item)."
    ),
}
