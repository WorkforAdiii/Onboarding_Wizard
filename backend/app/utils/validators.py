"""Utility validators used across the application."""


def check_duplicate_assets(assets: list[dict]) -> list[str]:
    """Check for duplicate asset names (case-insensitive).

    Args:
        assets: List of asset dicts, each with a 'name' key.

    Returns:
        List of duplicate names found. Empty list means no duplicates.
    """
    seen: set[str] = set()
    duplicates: list[str] = []

    for asset in assets:
        lower_name = asset["name"].strip().lower()
        if lower_name in seen:
            duplicates.append(asset["name"])
        else:
            seen.add(lower_name)

    return duplicates
