"""Service for validating formula expressions safely using ast."""

import ast


def extract_identifiers(expression: str) -> list[str]:
    """Parse a math expression and extract variable names.

    Uses ast.parse to safely parse the expression without evaluating it.

    Args:
        expression: Plain text math expression like "temperature + pressure * 2".

    Returns:
        Sorted, deduplicated list of identifier names found in the expression.

    Raises:
        SyntaxError: If the expression is not valid Python syntax.
    """
    tree = ast.parse(expression, mode="eval")
    names: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            names.add(node.id)

    return sorted(names)


def validate_formula(
    expression: str,
    enabled_parameters: list[str],
    target_parameter: str | None = None,
) -> dict:
    """Validate a formula expression against the set of enabled parameters.

    Args:
        expression: The formula expression string.
        enabled_parameters: List of parameter names currently enabled.
        target_parameter: Name of the parameter this formula is for
                          (to detect self-reference).

    Returns:
        Dict with keys: valid (bool), missing (list), depends_on (list),
        and optionally error (str).
    """
    if not expression or not expression.strip():
        return {
            "valid": False,
            "missing": [],
            "depends_on": [],
            "error": "Expression cannot be empty",
        }

    try:
        identifiers = extract_identifiers(expression)
    except SyntaxError as e:
        return {
            "valid": False,
            "missing": [],
            "depends_on": [],
            "error": f"Syntax error in expression: {e.msg}",
        }

    # Check for self-reference
    if target_parameter and target_parameter in identifiers:
        return {
            "valid": False,
            "missing": [],
            "depends_on": identifiers,
            "error": f"Self-reference detected: '{target_parameter}' cannot reference itself",
        }

    enabled_set = set(enabled_parameters)
    missing = [name for name in identifiers if name not in enabled_set]

    return {
        "valid": len(missing) == 0,
        "missing": missing,
        "depends_on": identifiers,
        "error": f"Unknown parameters: {', '.join(missing)}" if missing else None,
    }
