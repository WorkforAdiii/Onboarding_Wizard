"""Tests for the formula validation service."""

import pytest
from app.services.formula_service import validate_formula, extract_identifiers


class TestExtractIdentifiers:
    def test_simple_expression(self):
        result = extract_identifiers("temperature + pressure")
        assert result == ["pressure", "temperature"]

    def test_expression_with_constants(self):
        result = extract_identifiers("temperature * 2 + 100")
        assert result == ["temperature"]

    def test_complex_expression(self):
        result = extract_identifiers("(flow_rate * pressure) / (temperature + 273)")
        assert sorted(result) == ["flow_rate", "pressure", "temperature"]

    def test_duplicate_identifiers(self):
        result = extract_identifiers("temperature + temperature * 2")
        assert result == ["temperature"]

    def test_no_identifiers(self):
        result = extract_identifiers("42 + 10")
        assert result == []

    def test_syntax_error(self):
        with pytest.raises(SyntaxError):
            extract_identifiers("temperature @#$ pressure")


class TestValidateFormula:
    def test_valid_formula(self):
        result = validate_formula(
            "temperature + pressure",
            ["temperature", "pressure", "flow_rate"],
        )
        assert result["valid"] is True
        assert result["missing"] == []
        assert sorted(result["depends_on"]) == ["pressure", "temperature"]

    def test_missing_parameters(self):
        result = validate_formula(
            "temperature + unknown_var",
            ["temperature", "pressure"],
        )
        assert result["valid"] is False
        assert "unknown_var" in result["missing"]

    def test_empty_expression(self):
        result = validate_formula("", ["temperature"])
        assert result["valid"] is False
        assert "empty" in result["error"].lower()

    def test_whitespace_only_expression(self):
        result = validate_formula("   ", ["temperature"])
        assert result["valid"] is False
        assert "empty" in result["error"].lower()

    def test_syntax_error(self):
        result = validate_formula("temperature ++", ["temperature"])
        assert result["valid"] is False
        assert "syntax" in result["error"].lower()

    def test_self_reference(self):
        result = validate_formula(
            "efficiency * 100",
            ["efficiency", "temperature"],
            target_parameter="efficiency",
        )
        assert result["valid"] is False
        assert "self-reference" in result["error"].lower()

    def test_no_enabled_parameters(self):
        result = validate_formula("temperature + pressure", [])
        assert result["valid"] is False
        assert "temperature" in result["missing"]
        assert "pressure" in result["missing"]

    def test_constants_only(self):
        result = validate_formula("42 * 3.14", ["temperature"])
        assert result["valid"] is True
        assert result["depends_on"] == []
