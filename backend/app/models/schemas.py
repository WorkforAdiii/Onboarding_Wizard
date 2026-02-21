"""Pydantic v2 schemas for the onboarding wizard."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class AssetType(str, Enum):
    boiler = "boiler"
    turbine = "turbine"
    product = "product"
    kiln = "kiln"
    other = "other"


class PlantInfo(BaseModel):
    """Plant-level metadata collected in step 1."""
    name: str = Field(..., min_length=1, description="Plant name")
    description: Optional[str] = Field(default=None)
    address: str = Field(..., min_length=1, description="Plant address")
    manager_email: EmailStr = Field(..., description="Plant manager email")

    @field_validator("name", "address")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class Asset(BaseModel):
    """A single plant asset (step 2)."""
    name: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    type: AssetType

    @field_validator("name", "display_name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class ParameterEntry(BaseModel):
    """A single parameter from the registry (read-only shape)."""
    name: str
    display_name: str
    unit: str
    category: str
    section: str
    applicable_asset_types: list[str]


class EnabledParameter(BaseModel):
    """A parameter the user has enabled, possibly with overrides."""
    name: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    unit: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    section: str = Field(..., min_length=1)
    applicable_asset_types: list[str] = Field(default_factory=list)
    enabled: bool = True


class FormulaEntry(BaseModel):
    """A formula tied to a calculated parameter (step 4)."""
    parameter_name: str = Field(..., min_length=1)
    expression: str = Field(..., min_length=1)
    depends_on: list[str] = Field(default_factory=list)


class FormulaValidationRequest(BaseModel):
    """Request body for POST /api/formulas/validate."""
    expression: str
    enabled_parameters: list[str] = Field(default_factory=list)


class FormulaValidationResponse(BaseModel):
    """Structured response from formula validation."""
    valid: bool
    missing: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)
    error: Optional[str] = None


class OnboardingPayload(BaseModel):
    """Complete onboarding submission (step 5)."""
    plant: PlantInfo
    template_name: str = ""
    assets: list[Asset] = Field(..., min_length=1)
    parameters: list[EnabledParameter] = Field(default_factory=list)
    formulas: list[FormulaEntry] = Field(default_factory=list)


class TemplatePayload(BaseModel):
    """Payload for saving/loading templates."""
    name: str = Field(..., min_length=1)
    data: dict
