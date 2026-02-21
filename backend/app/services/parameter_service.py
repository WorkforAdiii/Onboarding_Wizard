"""Service for loading and filtering the parameter registry."""

import json
from pathlib import Path


_registry_cache: list[dict] | None = None
_REGISTRY_PATH = Path(__file__).parent.parent / "data" / "parameter_registry.json"


def _load_registry() -> list[dict]:
    """Load parameter registry from JSON, caching on first call."""
    global _registry_cache
    if _registry_cache is None:
        with open(_REGISTRY_PATH, "r", encoding="utf-8") as f:
            _registry_cache = json.load(f)
    return _registry_cache


def get_all_parameters() -> list[dict]:
    """Return the full parameter registry."""
    return _load_registry()


def filter_parameters(asset_type: str) -> list[dict]:
    """Return parameters applicable to the given asset type.

    Args:
        asset_type: One of boiler, turbine, product, kiln, other.

    Returns:
        Filtered list of parameter dicts.
    """
    registry = _load_registry()
    return [
        p for p in registry
        if asset_type.lower() in p["applicable_asset_types"]
    ]
