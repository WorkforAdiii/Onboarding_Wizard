"""Service for processing and validating the final onboarding payload."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.services.formula_service import extract_identifiers
from app.utils.validators import check_duplicate_assets

logger = logging.getLogger(__name__)

SUBMISSIONS_DIR = Path(__file__).resolve().parent.parent / "data" / "submissions"


def _ensure_dir():
    SUBMISSIONS_DIR.mkdir(parents=True, exist_ok=True)


def _find_by_plant_name(plant_name: str) -> Path | None:
    """Find an existing submission file by plant name."""
    _ensure_dir()
    for path in SUBMISSIONS_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                record = json.load(f)
            if record.get("plant_name", "").lower() == plant_name.lower():
                return path
        except (json.JSONDecodeError, KeyError):
            continue
    return None


def validate_payload(payload: dict) -> dict:
    """Validate and enrich the complete onboarding payload."""
    assets = payload.get("assets", [])

    if not assets:
        raise ValueError("At least one asset is required")

    duplicates = check_duplicate_assets([a if isinstance(a, dict) else a.dict() for a in assets])
    if duplicates:
        raise ValueError(f"Duplicate asset names found: {', '.join(duplicates)}")

    type_to_names: dict[str, list[str]] = {}
    for asset in assets:
        a = asset if isinstance(asset, dict) else asset.dict()
        asset_type = a["type"]
        type_to_names.setdefault(asset_type, []).append(a["name"])

    formulas = payload.get("formulas", [])
    for formula in formulas:
        f = formula if isinstance(formula, dict) else formula.dict()
        expr = f.get("expression", "")
        if expr.strip():
            try:
                deps = extract_identifiers(expr)
                if isinstance(formula, dict):
                    formula["depends_on"] = deps
                else:
                    formula.depends_on = deps
            except SyntaxError:
                pass

    parameters = payload.get("parameters", [])
    result = {
        "plant": payload["plant"] if isinstance(payload["plant"], dict) else payload["plant"].dict(),
        "template_name": payload.get("template_name", ""),
        "assets": [a if isinstance(a, dict) else a.dict() for a in assets],
        "parameters": [p if isinstance(p, dict) else p.dict() for p in parameters],
        "formulas": [f if isinstance(f, dict) else f.dict() for f in formulas],
    }

    logger.info("Onboarding payload validated: plant=%s, assets=%d, params=%d, formulas=%d",
                result["plant"].get("name", "?"), len(result["assets"]),
                len(result["parameters"]), len(result["formulas"]))

    return result


def save_submission(validated_payload: dict) -> dict:
    """Save or update a submission. Same plant name = same submission (upsert)."""
    _ensure_dir()
    plant_name = validated_payload.get("plant", {}).get("name", "unknown")
    now = datetime.now(timezone.utc)

    existing_path = _find_by_plant_name(plant_name)

    if existing_path:
        with open(existing_path, "r", encoding="utf-8") as f:
            old_record = json.load(f)
        submission_id = old_record.get("id")
        record = {
            "id": submission_id,
            "submitted_at": old_record.get("submitted_at"),
            "updated_at": now.isoformat(),
            "plant_name": plant_name,
            "template_name": validated_payload.get("template_name", ""),
            "data": validated_payload,
        }
        with open(existing_path, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, default=str)
        logger.info("Submission updated: %s", existing_path)
        return {"id": submission_id, "submitted_at": record["submitted_at"], "updated_at": record["updated_at"], "plant_name": plant_name, "is_update": True}
    else:
        submission_id = now.strftime("%Y%m%d_%H%M%S")
        filename = f"{submission_id}_{plant_name.replace(' ', '_').lower()}.json"
        record = {
            "id": submission_id,
            "submitted_at": now.isoformat(),
            "updated_at": None,
            "plant_name": plant_name,
            "template_name": validated_payload.get("template_name", ""),
            "data": validated_payload,
        }
        filepath = SUBMISSIONS_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2, default=str)
        logger.info("Submission saved: %s", filepath)
        return {"id": submission_id, "submitted_at": record["submitted_at"], "updated_at": None, "plant_name": plant_name, "is_update": False}


def list_submissions() -> list[dict]:
    """List all saved submissions (metadata only)."""
    _ensure_dir()
    submissions = []
    for path in sorted(SUBMISSIONS_DIR.glob("*.json"), reverse=True):
        try:
            with open(path, "r", encoding="utf-8") as f:
                record = json.load(f)
            submissions.append({
                "id": record.get("id"),
                "submitted_at": record.get("submitted_at"),
                "updated_at": record.get("updated_at"),
                "plant_name": record.get("plant_name"),
                "template_name": record.get("template_name", ""),
                "filename": path.name,
            })
        except (json.JSONDecodeError, KeyError):
            continue
    return submissions


def get_submission(submission_id: str) -> dict | None:
    """Load a single submission by ID."""
    _ensure_dir()
    for path in SUBMISSIONS_DIR.glob(f"{submission_id}_*.json"):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def delete_submission(submission_id: str) -> bool:
    """Delete a submission by ID. Returns True if found and deleted."""
    _ensure_dir()
    for path in SUBMISSIONS_DIR.glob(f"{submission_id}_*.json"):
        path.unlink()
        logger.info("Submission deleted: %s", path)
        return True
    return False
