import { useState, useEffect, useMemo } from 'react';
import { useWizard } from '../WizardContext';
import { fetchParameters } from '../api';

const CATEGORY_OPTIONS = ['input', 'output', 'emission', 'calculated'];
const SECTION_OPTIONS = ['COGEN BOILER', 'POWER PLANT', 'PRODUCTION', 'UTILITIES', 'EMISSIONS', 'WASTE'];

export default function ParametersStep({ onNext, onBack }) {
    const { state, setParameters } = useWizard();
    const [registry, setRegistry] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const assetTypes = useMemo(() => Array.from(new Set(state.assets.map(a => a.type))), [state.assets]);

    // Load parameters from backend whenever asset types change
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const promises = assetTypes.map((t) => fetchParameters(t));
                const results = await Promise.all(promises);
                const merged = new Map();
                for (const list of results) {
                    for (const p of list) {
                        if (!merged.has(p.name)) merged.set(p.name, p);
                    }
                }
                if (!cancelled) setRegistry([...merged.values()]);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load parameters. Is the backend running?');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (assetTypes.length > 0) {
            load();
        } else {
            setRegistry([]);
            setError('No assets defined. Go back to Step 2 to add assets first.');
        }
    }, [assetTypes.join(',')]);

    const registryMap = useMemo(() => {
        const map = new Map();
        for (const p of registry) {
            map.set(p.name, p);
        }
        return map;
    }, [registry]);

    const enabledMap = useMemo(() => {
        const map = new Map();
        for (const p of state.parameters) {
            map.set(p.name, p);
        }
        return map;
    }, [state.parameters]);

    useEffect(() => {
        if (registry.length === 0) return;
        const registryNames = new Set(registry.map((p) => p.name));
        const stale = state.parameters.filter((p) => !registryNames.has(p.name));
        if (stale.length > 0) {
            setParameters(state.parameters.filter((p) => registryNames.has(p.name)));
        }
    }, [registry]);

    function isEnabled(name) {
        const p = enabledMap.get(name);
        return p ? p.enabled : false;
    }

    function getOverride(name, field) {
        const p = enabledMap.get(name);
        return p ? p[field] : undefined;
    }

    function getUnitOptions(paramName) {
        const reg = registryMap.get(paramName);
        return reg?.unit_options || [reg?.unit || '—'];
    }

    function toggleParam(param) {
        const existing = enabledMap.get(param.name);
        if (existing) {
            const updated = state.parameters.filter((p) => p.name !== param.name);
            setParameters(updated);
        } else {
            setParameters([
                ...state.parameters,
                {
                    name: param.name,
                    display_name: param.display_name,
                    unit: param.unit,
                    category: param.category,
                    section: param.section,
                    applicable_asset_types: param.applicable_asset_types,
                    applicable_assets: [],
                    enabled: true,
                },
            ]);
        }
    }

    function updateOverride(name, field, value) {
        const updated = state.parameters.map((p) =>
            p.name === name ? { ...p, [field]: value } : p
        );
        setParameters(updated);
    }

    const grouped = useMemo(() => {
        const groups = {};
        for (const p of registry) {
            if (!groups[p.section]) groups[p.section] = [];
            groups[p.section].push(p);
        }
        return groups;
    }, [registry]);

    const enabledCount = state.parameters.filter((p) => p.enabled).length;

    return (
        <div className="step-container">
            <h2>Parameters</h2>
            <p className="step-description">
                Select and configure parameters for your assets. Use dropdowns to set units, categories, and sections.
            </p>

            {loading && <div className="loading">Loading parameters...</div>}
            {error && <div className="error-banner">{error}</div>}

            {!loading && !error && registry.length > 0 && (
                <div className="param-summary">
                    {enabledCount} of {registry.length} parameters enabled
                </div>
            )}

            {Object.entries(grouped).map(([section, params]) => (
                <div key={section} className="param-section">
                    <h3 className="section-title">{section}</h3>
                    <div className="param-grid">
                        {params.map((p) => {
                            const enabled = isEnabled(p.name);
                            const unitOptions = getUnitOptions(p.name);
                            const currentCategory = getOverride(p.name, 'category') || p.category;
                            const isCategoryEditable = currentCategory === 'input' || currentCategory === 'output';
                            return (
                                <div key={p.name} className={`param-card ${enabled ? 'param-enabled' : ''}`}>
                                    <div className="param-card-header">
                                        <label className="param-toggle">
                                            <input
                                                type="checkbox"
                                                checked={enabled}
                                                onChange={() => toggleParam(p)}
                                            />
                                            <span className="param-name">{p.display_name}</span>
                                        </label>
                                        <span className="param-badge">{currentCategory}</span>
                                    </div>

                                    {enabled && (
                                        <div className="param-overrides">
                                            <div className="form-group compact">
                                                <label>Unit</label>
                                                <select
                                                    value={getOverride(p.name, 'unit') || p.unit}
                                                    onChange={(e) => updateOverride(p.name, 'unit', e.target.value)}
                                                >
                                                    {unitOptions.map((u) => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group compact">
                                                <label>Category</label>
                                                {isCategoryEditable ? (
                                                    <select
                                                        value={currentCategory}
                                                        onChange={(e) => updateOverride(p.name, 'category', e.target.value)}
                                                    >
                                                        <option value="input">input</option>
                                                        <option value="output">output</option>
                                                    </select>
                                                ) : (
                                                    <span className="param-readonly">{currentCategory}</span>
                                                )}
                                            </div>
                                            <div className="form-group compact">
                                                <label>Section</label>
                                                <select
                                                    value={getOverride(p.name, 'section') || p.section}
                                                    onChange={(e) => updateOverride(p.name, 'section', e.target.value)}
                                                >
                                                    {SECTION_OPTIONS.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="param-types">
                                                {p.applicable_asset_types.map((t) => (
                                                    <span key={t} className="type-tag">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="step-actions">
                <button className="btn-outline" onClick={onBack}>
                    ← Back
                </button>
                <button className="btn-primary" onClick={onNext}>
                    Next →
                </button>
            </div>
        </div>
    );
}
