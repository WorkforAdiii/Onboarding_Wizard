import { useState, useRef, useMemo, useCallback } from 'react';
import { useWizard } from '../useWizard';
import { validateFormula } from '../api';

const FORMULA_TEMPLATES = {
    // Calculated Parameters
    efficiency: [
        { label: 'Boiler thermal efficiency (Direct)', expr: '(steam_generation * (steam_temperature - feedwater_temperature)) / (coal_consumption * coal_gcv) * 100' },
        { label: 'Boiler thermal efficiency (Simplified)', expr: '(steam_generation * 540) / (coal_consumption * coal_gcv) * 100' },
    ],
    specific_coal_consumption: [
        { label: 'Specific Coal Consumption (per MWh)', expr: 'coal_consumption * 1000 / power_generation' },
        { label: 'Specific Coal Consumption (per ton steam)', expr: '(coal_consumption * 1000) / steam_generation' },
    ],
    heat_rate: [
        { label: 'Standard heat rate', expr: '(coal_consumption * coal_gcv) / power_generation' },
        { label: 'Steam-based heat rate', expr: '(steam_consumption * 540) / power_generation' },
    ],
    plant_load_factor: [
        { label: 'Net generation ratio', expr: '(power_generation - auxiliary_power) / power_generation * 100' },
        { label: 'Export-based ratio', expr: '(power_export / power_generation) * 100' },
    ],
    // Emissions 
    co2_emissions: [
        { label: 'Estimated CO2 from Coal', expr: 'coal_consumption * 2.42' },
        { label: 'Estimated CO2 from Total Fuel', expr: '(coal_consumption * 2.42) + (lignite_consumption * 2.1) + (biomass_consumption * 1.5)' }
    ],
    so2_emissions: [
        { label: 'Estimated SO2', expr: 'coal_consumption * 0.05 * 1000' }
    ],
    nox_emissions: [
        { label: 'Estimated NOx', expr: 'coal_consumption * 0.02 * 1000' }
    ],
    // General Outputs
    power_export: [
        { label: 'Net Export', expr: 'power_generation - auxiliary_power - power_consumption' }
    ],
    auxiliary_power: [
        { label: 'Auxiliary Power (Fixed %)', expr: 'power_generation * 0.085' }
    ],
    production_output: [
        { label: 'Steam-to-Product Ratio Base', expr: 'steam_consumption * 0.75' }
    ],
    fly_ash_generated: [
        { label: 'Expected Fly Ash from Coal', expr: 'coal_consumption * 0.35' }
    ]
};

function extractParamNames(expr) {
    const re = /[a-zA-Z_]\w*/g;
    const matches = expr.match(re) || [];
    return [...new Set(matches)];
}

function getAvailableTemplates(paramName, enabledNames) {
    // Return all templates for the parameter so the user can see them and select them.
    // If they select one with missing parameters, the validation step will gracefully tell them 
    // which parameters they need to go back and enable.
    return FORMULA_TEMPLATES[paramName] || [];
}

// ── Autocomplete input component ──
function FormulaInput({ value, onChange, onValidate, suggestions, className, placeholder }) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSugs, setFilteredSugs] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef(null);

    function getWordAtCursor(text, cursorPos) {
        const before = text.slice(0, cursorPos);
        const match = before.match(/[a-zA-Z_]\w*$/);
        return match ? { word: match[0], start: cursorPos - match[0].length } : null;
    }

    function handleChange(e) {
        const newVal = e.target.value;
        onChange(newVal);
        const cursor = e.target.selectionStart;
        const wordInfo = getWordAtCursor(newVal, cursor);
        if (wordInfo && wordInfo.word.length >= 1) {
            const matches = suggestions.filter((s) =>
                s.toLowerCase().startsWith(wordInfo.word.toLowerCase()) && s !== wordInfo.word
            );
            setFilteredSugs(matches);
            setShowSuggestions(matches.length > 0);
            setSelectedIdx(0);
        } else {
            setShowSuggestions(false);
        }
    }

    function applySuggestion(sug) {
        const cursor = inputRef.current.selectionStart;
        const wordInfo = getWordAtCursor(value, cursor);
        if (wordInfo) {
            const before = value.slice(0, wordInfo.start);
            const after = value.slice(cursor);
            onChange(before + sug + after);
        }
        setShowSuggestions(false);
        inputRef.current.focus();
    }

    function handleKeyDown(e) {
        if (!showSuggestions) {
            if (e.key === 'Enter') { e.preventDefault(); onValidate(); }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(i + 1, filteredSugs.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            applySuggestion(filteredSugs[selectedIdx]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    }

    function handleBlur() {
        setTimeout(() => setShowSuggestions(false), 150);
    }

    return (
        <div className="formula-autocomplete-wrap">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className={className}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck="false"
            />
            {showSuggestions && (
                <div className="formula-suggestions">
                    {filteredSugs.map((s, i) => (
                        <div
                            key={s}
                            className={`formula-suggestion-item ${i === selectedIdx ? 'selected' : ''}`}
                            onMouseDown={() => applySuggestion(s)}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main component ──
export default function FormulasStep({ onNext, onBack }) {
    const { state, setFormulas } = useWizard();
    const [validationResults, setValidationResults] = useState({});
    const [validating, setValidating] = useState({});
    const [showTemplates, setShowTemplates] = useState({});

    const calculatedParams = useMemo(() => {
        return state.parameters.filter((p) => {
            if (!p.enabled) return false;
            if (p.category === 'calculated') return true;
            // Also allow formulas for any parameter that has a template defined
            // so they can choose to calculate things like emissions or outputs
            return FORMULA_TEMPLATES[p.name] !== undefined;
        });
    }, [state.parameters]);

    const enabledNames = useMemo(() => {
        return state.parameters.filter((p) => p.enabled).map((p) => p.name);
    }, [state.parameters]);

    const formulaMap = useMemo(() => {
        const map = {};
        for (const f of state.formulas) map[f.parameter_name] = f;
        return map;
    }, [state.formulas]);

    function getExpression(paramName) {
        return formulaMap[paramName]?.expression || '';
    }

    function updateExpression(paramName, expression) {
        const existing = state.formulas.filter((f) => f.parameter_name !== paramName);
        if (expression.trim()) {
            existing.push({ parameter_name: paramName, expression, depends_on: [] });
        }
        setFormulas(existing);
        setValidationResults((prev) => { const n = { ...prev }; delete n[paramName]; return n; });
    }

    const handleValidate = useCallback(async (paramName, expression) => {
        if (!expression.trim()) {
            setValidationResults((prev) => ({
                ...prev,
                [paramName]: { valid: false, error: 'Expression cannot be empty', missing: [], depends_on: [] },
            }));
            return;
        }

        setValidating((prev) => ({ ...prev, [paramName]: true }));
        try {
            const result = await validateFormula(expression, enabledNames);
            setValidationResults((prev) => ({ ...prev, [paramName]: result }));
            if (result.valid) {
                const updated = state.formulas.map((f) =>
                    f.parameter_name === paramName ? { ...f, depends_on: result.depends_on } : f
                );
                setFormulas(updated);
            }
        } catch (err) {
            setValidationResults((prev) => ({
                ...prev,
                [paramName]: { valid: false, error: err.message, missing: [], depends_on: [] },
            }));
        } finally {
            setValidating((prev) => ({ ...prev, [paramName]: false }));
        }
    }, [enabledNames, state.formulas, setFormulas]);

    const allValid = useMemo(() => {
        if (calculatedParams.length === 0) return true;
        return calculatedParams.every((p) => {
            const expr = getExpression(p.name);

            // If it's not a strictly "calculated" parameter, the formula is optional
            if (p.category !== 'calculated' && !expr.trim()) return true;

            // If it is strictly "calculated", it must have an expression
            if (p.category === 'calculated' && !expr.trim()) return false;

            // If there IS an expression, it must be valid
            const res = validationResults[p.name];
            return res && res.valid;
        });
    }, [calculatedParams, state.formulas, validationResults]);

    function toggleTemplates(paramName) {
        setShowTemplates((prev) => ({ ...prev, [paramName]: !prev[paramName] }));
    }

    if (calculatedParams.length === 0) {
        return (
            <div className="step-container">
                <h2>Formulas</h2>
                <p className="step-description">
                    No parameters require formulas. You can go back and enable calculated parameters,
                    or continue to the next step.
                </p>
                <div className="step-actions">
                    <button className="btn-outline" onClick={onBack}>← Back</button>
                    <button className="btn-primary" onClick={onNext}>Next →</button>
                </div>
            </div>
        );
    }

    return (
        <div className="step-container">
            <h2>Formulas</h2>
            <p className="step-description">
                Define expressions for your parameters.
                Parameters with a <strong>Calculated</strong> category <em>must</em> have a valid formula.
                For other parameters, formulas are optional but helpful for auto-filling data later.
            </p>

            {calculatedParams.map((param) => {
                const expr = getExpression(param.name);
                const result = validationResults[param.name];
                const isValidating = validating[param.name];
                const templates = getAvailableTemplates(param.name, enabledNames);
                const templatesVisible = showTemplates[param.name];

                return (
                    <div key={param.name} className="formula-card">
                        <div className="formula-header">
                            <span className="formula-param-name">{param.display_name}</span>
                            <div className="formula-header-right">
                                {templates.length > 0 && (
                                    <button
                                        className="btn-template-toggle"
                                        onClick={() => toggleTemplates(param.name)}
                                        title="Show formula templates"
                                    >
                                        {templatesVisible ? 'Hide Templates' : '⚡ Templates'}
                                    </button>
                                )}
                                <span className="param-badge">{param.unit}</span>
                            </div>
                        </div>

                        {templatesVisible && templates.length > 0 && (
                            <div className="formula-templates">
                                {templates.map((t) => (
                                    <button
                                        key={t.label}
                                        className="formula-template-btn"
                                        onClick={() => {
                                            updateExpression(param.name, t.expr);
                                            setShowTemplates((prev) => ({ ...prev, [param.name]: false }));
                                        }}
                                    >
                                        <span className="template-label">{t.label}</span>
                                        <code className="template-expr">{t.expr}</code>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Expression</label>
                            <div className="formula-input-row">
                                <FormulaInput
                                    value={expr}
                                    onChange={(v) => updateExpression(param.name, v)}
                                    onValidate={() => handleValidate(param.name, expr)}
                                    suggestions={enabledNames.filter((n) => n !== param.name)}
                                    className={result && !result.valid ? 'input-error' : result?.valid ? 'input-valid' : ''}
                                    placeholder={param.category === 'calculated' ? "Required: e.g. steam_generation * 100" : "Optional formula..."}
                                />
                                <button
                                    className="btn-validate"
                                    onClick={() => handleValidate(param.name, expr)}
                                    disabled={isValidating || !expr.trim()}
                                >
                                    {isValidating ? '...' : 'Validate'}
                                </button>
                                {param.category !== 'calculated' && expr.trim() && (
                                    <button
                                        className="btn-outline"
                                        style={{ marginLeft: '8px', padding: '0 8px' }}
                                        onClick={() => updateExpression(param.name, '')}
                                        title="Clear optional formula"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {result && (
                            <div className={`formula-result ${result.valid ? 'valid' : 'invalid'}`}>
                                {result.valid ? (
                                    <>
                                        <span className="formula-check">✓ Valid</span>
                                        {result.depends_on.length > 0 && (
                                            <span className="formula-deps">
                                                Depends on: {result.depends_on.join(', ')}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="formula-x">✗ Invalid</span>
                                        {result.error && <span className="formula-error">{result.error}</span>}
                                        {result.missing.length > 0 && (
                                            <span className="formula-missing">
                                                Missing: {result.missing.join(', ')} — Go to <strong>Step 3 (Parameters)</strong> and enable these parameters.
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {!result && param.category !== 'calculated' && !expr.trim() && (
                            <div className="formula-result optional">
                                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Formula is optional for {param.category} parameters.</span>
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="step-actions">
                <button className="btn-outline" onClick={onBack}>← Back</button>
                <button className="btn-primary" onClick={onNext} disabled={!allValid}>
                    Next →
                </button>
            </div>
        </div>
    );
}
