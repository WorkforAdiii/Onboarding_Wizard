"""Tests for the parameter service."""

from app.services.parameter_service import filter_parameters, get_all_parameters


class TestGetAllParameters:
    def test_returns_list(self):
        result = get_all_parameters()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_parameter_shape(self):
        result = get_all_parameters()
        param = result[0]
        assert "name" in param
        assert "display_name" in param
        assert "unit" in param
        assert "category" in param
        assert "section" in param
        assert "applicable_asset_types" in param


class TestFilterParameters:
    def test_filter_boiler(self):
        result = filter_parameters("boiler")
        assert len(result) > 0
        for p in result:
            assert "boiler" in p["applicable_asset_types"]

    def test_filter_turbine(self):
        result = filter_parameters("turbine")
        assert len(result) > 0
        for p in result:
            assert "turbine" in p["applicable_asset_types"]

    def test_filter_unknown_type(self):
        result = filter_parameters("nonexistent_type")
        assert result == []

    def test_filter_case_insensitive(self):
        lower = filter_parameters("boiler")
        # The registry uses lowercase, so uppercase should return fewer
        upper = filter_parameters("BOILER")
        # Our filter uses .lower() so they should match
        assert len(lower) == len(upper)

    def test_all_asset_types_covered(self):
        for asset_type in ["boiler", "turbine", "product", "kiln", "other"]:
            result = filter_parameters(asset_type)
            # At least the overall_effectiveness should match all types
            names = [p["name"] for p in result]
            assert "overall_effectiveness" in names, f"{asset_type} missing overall_effectiveness"
