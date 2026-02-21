"""API routes for template save/load (stretch feature)."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import TemplatePayload
from app.services import template_service

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.post("")
def save_template(payload: TemplatePayload):
    """Save a named template."""
    return template_service.save_template(payload.name, payload.data)


@router.get("")
def list_all_templates():
    """List all saved template names."""
    return template_service.list_templates()


@router.get("/{name}")
def get_template(name: str):
    """Load a template by name."""
    result = template_service.load_template(name)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Template '{name}' not found")
    return {"name": name, "data": result}
