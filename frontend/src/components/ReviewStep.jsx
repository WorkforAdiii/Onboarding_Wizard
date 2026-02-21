import { useState, useMemo, useEffect } from 'react';
import { useWizard } from '../WizardContext';
import { submitOnboarding, saveTemplate, loadTemplate, listTemplates, listSubmissions, deleteSubmission } from '../api';

const CONFIRM_OVERWRITE = (name) => confirm(`Template with the name "${name}" already exists. Do you wish to overwrite it?`);

export default function ReviewStep({ onBack, onJumpTo }) {
    const { state, setTemplateName, setSubmitted, loadState, reset } = useWizard();
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [templateMsg, setTemplateMsg] = useState('');
    const [loadTemplateName, setLoadTemplateName] = useState('');
    const [templateList, setTemplateList] = useState([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [deleting, setDeleting] = useState(null);
    const [currentDeleted, setCurrentDeleted] = useState(false);

    const payload = useMemo(() => ({
        plant: state.plant,
        template_name: state.templateName.trim(),
        assets: state.assets.map((a) => ({ name: a.name, display_name: a.display_name, type: a.type })),
        parameters: state.parameters.filter((p) => p.enabled).map(({ applicable_assets, ...rest }) => rest),
        formulas: state.formulas.filter((f) => f.expression.trim()),
    }), [state]);

    const isValid = useMemo(() => {
        if (!state.plant.name.trim() || !state.plant.address.trim() || !state.plant.manager_email.trim()) return false;
        if (state.assets.length === 0) return false;
        if (!state.templateName.trim()) return false;
        return true;
    }, [state]);

    async function handleSubmit() {
        setSubmitting(true);
        setSubmitError('');
        try {
            const result = await submitOnboarding(payload);
            setSubmitResult(result);
            setSubmitted();
            try { setSubmissions(await listSubmissions()); } catch { }
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function handleDownload() {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `latspace_config_${state.plant.name.replace(/\s+/g, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleSaveTemplate() {
        if (!state.templateName.trim()) return;
        try {
            const existing = await listTemplates();
            if (existing.includes(state.templateName.trim())) {
                if (!CONFIRM_OVERWRITE(state.templateName.trim())) return;
            }
            await saveTemplate(state.templateName.trim(), payload);
            setTemplateMsg(`Template "${state.templateName.trim()}" saved`);
            setTemplateName('');
        } catch (err) {
            setTemplateMsg(`Error: ${err.message}`);
        }
    }

    async function handleLoadTemplates() {
        try {
            const list = await listTemplates();
            setTemplateList(list);
            setShowTemplates(true);
        } catch (err) {
            setTemplateMsg(`Error: ${err.message}`);
        }
    }

    async function handleLoadTemplate(name) {
        try {
            const result = await loadTemplate(name);
            loadState(result.data);
            setShowTemplates(false);
            setTemplateMsg(`Template "${name}" loaded`);
        } catch (err) {
            setTemplateMsg(`Error: ${err.message}`);
        }
    }

    async function handleDelete(id) {
        if (!confirm(`Delete submission ${id}?`)) return;
        setDeleting(id);
        try {
            await deleteSubmission(id);
            setSubmissions((prev) => prev.filter((s) => s.id !== id));
            if (submitResult?.submission?.id === id) {
                setSubmitResult(null);
                setCurrentDeleted(true);
            }
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setDeleting(null);
        }
    }

    // Fetch past submissions on success
    useEffect(() => {
        if (submitResult) {
            listSubmissions().then(setSubmissions).catch(() => { });
        }
    }, [submitResult]);

    if (currentDeleted) {
        return (
            <div className="step-container">
                <div className="error-banner" style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: 0 }}>Submission Deleted</h3>
                    <p style={{ margin: '8px 0 0' }}>The submitted configuration has been removed.</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                    <button className="btn-primary" onClick={reset}>Start Over</button>
                </div>
            </div>
        );
    }

    if (submitResult) {
        const sub = submitResult.submission;
        return (
            <div className="step-container">
                <div className="success-banner">
                    <h2>✓ Onboarding Complete</h2>
                    <p>
                        {sub?.is_update
                            ? 'Your plant configuration has been updated successfully.'
                            : 'Your plant configuration has been submitted and saved successfully.'}
                    </p>
                    {sub && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                            Submission ID: <strong>{sub.id}</strong>
                            {sub.is_update && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>(updated)</span>}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <button className="btn-secondary" onClick={handleDownload}>↓ Download JSON</button>
                    <button className="btn-outline" onClick={reset}>Start Over</button>
                </div>

                {submissions.length > 0 && (
                    <div className="review-section">
                        <h3>Past Submissions</h3>
                        <table className="review-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Plant Name</th>
                                    <th>Template Name</th>
                                    <th>Submitted At</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => (
                                    <tr key={s.id}>
                                        <td><code>{s.id}</code></td>
                                        <td>{s.plant_name}</td>
                                        <td>{s.template_name ? <span style={{ color: 'var(--accent)' }}>{s.template_name}</span> : '—'}</td>
                                        <td>{new Date(s.submitted_at).toLocaleString()}</td>
                                        <td>
                                            <button
                                                className="btn-link"
                                                style={{ color: 'var(--danger)' }}
                                                onClick={() => handleDelete(s.id)}
                                                disabled={deleting === s.id}
                                            >
                                                {deleting === s.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="step-container">
            <h2>Review & Submit</h2>
            <p className="step-description">Review your configuration before submitting.</p>

            <div className="review-section">
                <div className="review-section-header">
                    <h3>Plant Information</h3>
                    <button className="btn-link" onClick={() => onJumpTo(0)}>Edit</button>
                </div>
                <div className="review-grid">
                    <div><strong>Name:</strong> {state.plant.name}</div>
                    <div><strong>Address:</strong> {state.plant.address}</div>
                    <div><strong>Email:</strong> {state.plant.manager_email}</div>
                    {state.plant.description && <div><strong>Description:</strong> {state.plant.description}</div>}
                </div>
            </div>

            <div className="review-section">
                <div className="review-section-header">
                    <h3>Assets ({state.assets.length})</h3>
                    <button className="btn-link" onClick={() => onJumpTo(1)}>Edit</button>
                </div>
                <table className="review-table">
                    <thead>
                        <tr><th>Name</th><th>Display Name</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                        {state.assets.map((a, i) => (
                            <tr key={i}>
                                <td>{a.name}</td>
                                <td>{a.display_name}</td>
                                <td className="capitalize">{a.type}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="review-section">
                <div className="review-section-header">
                    <h3>Parameters ({state.parameters.filter((p) => p.enabled).length})</h3>
                    <button className="btn-link" onClick={() => onJumpTo(2)}>Edit</button>
                </div>
                {state.parameters.filter((p) => p.enabled).length > 0 ? (
                    <table className="review-table">
                        <thead>
                            <tr><th>Name</th><th>Unit</th><th>Category</th><th>Section</th></tr>
                        </thead>
                        <tbody>
                            {state.parameters.filter((p) => p.enabled).map((p, i) => (
                                <tr key={i}>
                                    <td>{p.display_name}</td>
                                    <td>{p.unit}</td>
                                    <td>{p.category}</td>
                                    <td>{p.section}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="review-empty">No parameters selected</p>
                )}
            </div>

            <div className="review-section">
                <div className="review-section-header">
                    <h3>Formulas ({state.formulas.filter((f) => f.expression.trim()).length})</h3>
                    <button className="btn-link" onClick={() => onJumpTo(3)}>Edit</button>
                </div>
                {state.formulas.filter((f) => f.expression.trim()).length > 0 ? (
                    <table className="review-table">
                        <thead>
                            <tr><th>Parameter</th><th>Expression</th><th>Depends On</th></tr>
                        </thead>
                        <tbody>
                            {state.formulas.filter((f) => f.expression.trim()).map((f, i) => (
                                <tr key={i}>
                                    <td>{f.parameter_name}</td>
                                    <td><code>{f.expression}</code></td>
                                    <td>{f.depends_on.length > 0 ? f.depends_on.join(', ') : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="review-empty">No formulas defined</p>
                )}
            </div>

            {/* Template controls */}
            <div className="template-controls">
                <h3>Templates</h3>
                <div className="template-row">
                    <input
                        type="text"
                        placeholder="Template name *"
                        value={state.templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        required
                    />
                    <button className="btn-secondary" onClick={handleSaveTemplate} disabled={!state.templateName.trim()}>
                        Save Template
                    </button>
                    <button className="btn-outline" onClick={handleLoadTemplates}>
                        Load Template
                    </button>
                </div>
                {templateMsg && <p className="template-msg">{templateMsg}</p>}
                {showTemplates && templateList.length > 0 && (
                    <div className="template-list">
                        {templateList.map((name) => (
                            <button key={name} className="btn-link" onClick={() => handleLoadTemplate(name)}>
                                {name}
                            </button>
                        ))}
                    </div>
                )}
                {showTemplates && templateList.length === 0 && (
                    <p className="review-empty">No templates saved yet</p>
                )}
            </div>

            {submitError && <div className="error-banner">{submitError}</div>}

            <div className="step-actions">
                <button className="btn-outline" onClick={onBack}>← Back</button>
                <div className="step-actions-right">
                    {!state.templateName.trim() && (
                        <span style={{ fontSize: 13, color: 'var(--danger)', marginRight: 16, alignSelf: 'center' }}>
                            * Template name required to submit
                        </span>
                    )}
                    <button className="btn-secondary" onClick={handleDownload} style={{ marginRight: 12 }}>
                        ↓ Download JSON
                    </button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={!isValid || submitting}>
                        {submitting ? 'Submitting...' : 'Submit Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
