"""In-memory template storage service."""


_templates: dict[str, dict] = {}


def save_template(name: str, data: dict) -> dict:
    """Save a template by name.

    Args:
        name: Unique template name.
        data: The template data to store.

    Returns:
        Confirmation dict with saved template name.
    """
    _templates[name] = data
    return {"name": name, "saved": True}


def load_template(name: str) -> dict | None:
    """Load a template by name.

    Args:
        name: Template name to look up.

    Returns:
        The template data, or None if not found.
    """
    return _templates.get(name)


def list_templates() -> list[str]:
    """Return all saved template names."""
    return list(_templates.keys())
