import json
import os

path = r"c:\Users\MY PC\Desktop\Onboarding_Wizard\backend\app\data\parameter_registry.json"

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

for p in data:
    if p["name"] in ["power_generation", "power_consumption", "power_export", "auxiliary_power"]:
        if "boiler" not in p["applicable_asset_types"]:
            p["applicable_asset_types"].append("boiler")
            
    if p["name"] == "specific_coal_consumption":
        if "kg/MT" not in p["unit_options"]:
            p["unit_options"].append("kg/MT")

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)
    
print("Successfully modified parameter_registry.json")
