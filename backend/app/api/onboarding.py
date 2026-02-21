"""API routes for final onboarding submission."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import OnboardingPayload
from app.services import onboarding_service

router = APIRouter(prefix="/api", tags=["onboarding"])


@router.post("/onboarding")
def submit_onboarding(payload: OnboardingPayload):
    """Accept, validate, and save the complete onboarding configuration."""
    try:
        result = onboarding_service.validate_payload(payload.model_dump())
        meta = onboarding_service.save_submission(result)
        return {**result, "submission": meta}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/submissions")
def list_submissions():
    """List all saved submissions (metadata only)."""
    return onboarding_service.list_submissions()


@router.get("/submissions/{submission_id}")
def get_submission(submission_id: str):
    """Load a single submission by ID."""
    record = onboarding_service.get_submission(submission_id)
    if not record:
        raise HTTPException(status_code=404, detail="Submission not found")
    return record


@router.delete("/submissions/{submission_id}")
def delete_submission(submission_id: str):
    """Delete a submission by ID."""
    deleted = onboarding_service.delete_submission(submission_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"deleted": True, "id": submission_id}
