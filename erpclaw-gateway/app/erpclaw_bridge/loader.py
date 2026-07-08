"""Collision-safe loader for erpclaw's ``mcp/`` package.

erpclaw's ``mcp/`` directory is a Python package literally named ``mcp``, which
collides with the official MCP SDK distribution on PyPI. erpclaw's own
``mcp/server.py`` works around this by loading itself under a synthetic module
name via ``importlib.util.spec_from_file_location`` rather than putting its
directory on ``sys.path`` and doing a normal ``import mcp`` (which would either
collide with or shadow the real SDK). This module applies the identical
technique so the gateway can reuse ``tool_router.py``/``confirm.py`` without
risking a collision if the gateway itself ever depends on the real ``mcp`` SDK.
"""
import importlib
import importlib.util
import sys

from app.config import settings

_PKG_NAME = "erpclaw_mcp_bridge"


def _erpclaw_mcp_dir() -> str:
    import os
    return os.path.join(settings.erpclaw_repo_root, "mcp")


def _load_package():
    if _PKG_NAME in sys.modules:
        return sys.modules[_PKG_NAME]

    import os

    pkg_dir = _erpclaw_mcp_dir()
    init_path = os.path.join(pkg_dir, "__init__.py")
    spec = importlib.util.spec_from_file_location(
        _PKG_NAME, init_path, submodule_search_locations=[pkg_dir]
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load erpclaw mcp package from {pkg_dir!r}")
    pkg = importlib.util.module_from_spec(spec)
    sys.modules[_PKG_NAME] = pkg
    spec.loader.exec_module(pkg)
    return pkg


def tool_router():
    """The erpclaw ``mcp.tool_router`` module, loaded under a collision-free name."""
    _load_package()
    return importlib.import_module(f"{_PKG_NAME}.tool_router")


def confirm():
    """The erpclaw ``mcp.confirm`` module, loaded under a collision-free name."""
    _load_package()
    return importlib.import_module(f"{_PKG_NAME}.confirm")


def skill_reader():
    """The erpclaw ``mcp.skill_reader`` module, loaded under a collision-free name."""
    _load_package()
    return importlib.import_module(f"{_PKG_NAME}.skill_reader")
