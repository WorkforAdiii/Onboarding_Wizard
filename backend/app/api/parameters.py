"""API routes for parameter registry queries."""

from fastapi import APIRouter, Query

from app.services import parameter_service

router = APIRouter(prefix="/api/parameters", tags=["parameters"])


@router.get("")
def get_parameters(asset_type: str = Query(default="", description="Filter by asset type")):
    """Fetch parameters, optionally filtered by asset type."""
    if asset_type:
        return parameter_service.filter_parameters(asset_type)
    return parameter_service.get_all_parameters()
