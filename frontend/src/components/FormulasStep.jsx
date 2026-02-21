import { useState, useRef, useMemo, useCallback } from 'react';
import { useWizard } from '../WizardContext';
import { validateFormula } from '../api';

const FORMULA_TEMPLATES = {
    efficiency: [
        { label: 'Boiler thermal efficiency', expr: '(steam_generation * 540) / (coal_consumption * coal_gcv) * 100' },
        { label: 'Temperature differential', expr: '(steam_temperature - feedwater_temperature) / steam_temperature * 100' },
        { label: 'Simple steam/coal ratio', expr: 'steam_generation / coal_consumption * 100' },
    ],
    specific_coal_consumption: [
        { label: 'Coal per power', expr: 'coal_consumption * 1000 / power_generation' },
        { label: 'Total fuel per power', expr: '(coal_consumption + lignite_consumption + biomass_consumption) * 1000 / power_generation' },
    ],
    heat_rate: [
        { label: 'Standard heat rate', expr: 'coal_consumption * coal_gcv / power_generation' },
        { label: 'Steam-based', expr: 'steam_consumption * 540 / power_generation' },
    ],
    plant_load_factor: [
        { label: 'Net generation ratio', expr: '(power_generation - auxiliary_power) / power_generation * 100' },
        { label: 'Export-based', expr: 'power_export / power_generation * 100' },
        { label: 'Expansion ratio', expr: 'turbine_inlet_pressure / turbine_exhaust_pressure' },
    ],
};

function extractParamNames(expr) {
    const re = /[a-zA-Z_]\w*/g;
    const matches = expr.match(re) || [];
    return [...new Set(matches)];
}

function getAvailableTemplates(paramName, enabledNames) {
    const allTemplates = FORMULA_TEMPLATES[paramName] || [];
    return allTemplates.filter((t) => {
        const refs = extractParamNames(t.expr);
        return refs.every((r) => enabledNames.includes(r));
    });
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
        return state.parameters.filter((p) => p.enabled && p.category === 'calculated');
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
            if (!expr.trim()) return true;
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
                    No calculated parameters are enabled. You can go back and enable parameters with category "calculated",
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
                Define expressions for calculated parameters. Use enabled parameter names as variables (e.g.{' '}
                <code>steam_generation / coal_consumption * 100</code>).
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
                                    placeholder="e.g. steam_generation / coal_consumption * 100"
                                />
                                <button
                                    className="btn-validate"
                                    onClick={() => handleValidate(param.name, expr)}
                                    disabled={isValidating || !expr.trim()}
                                >
                                    {isValidating ? '...' : 'Validate'}
                                </button>
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
