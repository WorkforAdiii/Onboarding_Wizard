"""Tests for the onboarding service and asset validators."""

import pytest
from app.services.onboarding_service import validate_payload
from app.utils.validators import check_duplicate_assets


class TestCheckDuplicateAssets:
    def test_no_duplicates(self):
        assets = [
            {"name": "Boiler A"},
            {"name": "Boiler B"},
        ]
        assert check_duplicate_assets(assets) == []

    def test_exact_duplicates(self):
        assets = [
            {"name": "Boiler A"},
            {"name": "Boiler A"},
        ]
        result = check_duplicate_assets(assets)
        assert len(result) == 1
        assert result[0] == "Boiler A"

    def test_case_insensitive_duplicates(self):
        assets = [
            {"name": "Boiler A"},
            {"name": "boiler a"},
        ]
        result = check_duplicate_assets(assets)
        assert len(result) == 1

    def test_whitespace_handling(self):
        assets = [
            {"name": "  Boiler A  "},
            {"name": "Boiler A"},
        ]
        result = check_duplicate_assets(assets)
        assert len(result) == 1

    def test_empty_list(self):
        assert check_duplicate_assets([]) == []

    def test_single_asset(self):
        assert check_duplicate_assets([{"name": "Only One"}]) == []


class TestValidatePayload:
    def _make_payload(self, **overrides):
        base = {
            "plant": {
                "name": "Test Plant",
                "description": "A test plant",
                "address": "123 Main St",
                "manager_email": "admin@test.com",
            },
            "assets": [
                {"name": "boiler_1", "display_name": "Main Boiler", "type": "boiler"},
            ],
            "parameters": [
                {
                    "name": "temperature",
                    "display_name": "Temperature",
                    "unit": "°C",
                    "category": "measured",
                    "section": "Thermal",
                    "applicable_asset_types": ["boiler"],
                    "applicable_assets": [],
                    "enabled": True,
                }
            ],
            "formulas": [
                {
                    "parameter_name": "efficiency",
                    "expression": "temperature * 0.95",
                    "depends_on": [],
                }
            ],
        }
        base.update(overrides)
        return base

    def test_valid_payload(self):
        payload = self._make_payload()
        result = validate_payload(payload)
        assert "plant" in result
        assert "assets" in result
        assert "parameters" in result
        assert "formulas" in result

    def test_empty_assets_raises(self):
        payload = self._make_payload(assets=[])
        with pytest.raises(ValueError, match="At least one asset"):
            validate_payload(payload)

    def test_duplicate_assets_raises(self):
        payload = self._make_payload(assets=[
            {"name": "boiler_1", "display_name": "B1", "type": "boiler"},
            {"name": "Boiler_1", "display_name": "B2", "type": "boiler"},
        ])
        with pytest.raises(ValueError, match="Duplicate"):
            validate_payload(payload)

    def test_resolves_applicable_assets(self):
        payload = self._make_payload()
        result = validate_payload(payload)
        param = result["parameters"][0]
        assert "boiler_1" in param["applicable_assets"]

    def test_autofills_depends_on(self):
        payload = self._make_payload()
        result = validate_payload(payload)
        formula = result["formulas"][0]
        assert "temperature" in formula["depends_on"]

    def test_output_has_exactly_four_keys(self):
        payload = self._make_payload()
        result = validate_payload(payload)
        assert set(result.keys()) == {"plant", "assets", "parameters", "formulas"}
