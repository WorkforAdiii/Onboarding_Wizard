"""API routes for formula validation."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import FormulaValidationRequest, FormulaValidationResponse
from app.services import formula_service

router = APIRouter(prefix="/api/formulas", tags=["formulas"])


@router.post("/validate", response_model=FormulaValidationResponse)
def validate_formula(request: FormulaValidationRequest):
    """Validate a formula expression against enabled parameters."""
    result = formula_service.validate_formula(
        expression=request.expression,
        enabled_parameters=request.enabled_parameters,
    )
    return result
