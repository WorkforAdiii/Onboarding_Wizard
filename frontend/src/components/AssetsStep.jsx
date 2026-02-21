import { useState, useEffect } from 'react';
import { useWizard } from '../WizardContext';

const ASSET_TYPES = ['boiler', 'turbine', 'product', 'kiln', 'other'];

function emptyAsset() {
    return { name: '', display_name: '', type: 'boiler' };
}

function findDuplicates(assets) {
    const seen = new Set();
    const dupes = new Set();
    for (const a of assets) {
        const key = a.name.trim().toLowerCase();
        if (key && seen.has(key)) dupes.add(key);
        else seen.add(key);
    }
    return dupes;
}

export default function AssetsStep({ onNext, onBack }) {
    const { state, setAssets } = useWizard();
    const [errors, setErrors] = useState([]);
    const [listError, setListError] = useState('');

    const assets = state.assets.length > 0 ? state.assets : [emptyAsset()];

    useEffect(() => {
        if (state.assets.length === 0) setAssets([emptyAsset()]);
    }, []);

    function validateAll(list) {
        const dupes = findDuplicates(list);
        const errs = list.map((a) => {
            const e = {};
            if (!a.name.trim()) e.name = 'Name is required';
            else if (dupes.has(a.name.trim().toLowerCase())) e.name = 'Duplicate name';
            if (!a.display_name.trim()) e.display_name = 'Display name is required';
            return e;
        });
        return errs;
    }

    function updateAsset(index, field, value) {
        const updated = [...assets];
        updated[index] = { ...updated[index], [field]: value };
        setAssets(updated);
        setListError('');
    }

    function addAsset() {
        setAssets([...assets, emptyAsset()]);
    }

    function removeAsset(index) {
        if (assets.length <= 1) return;
        const updated = assets.filter((_, i) => i !== index);
        setAssets(updated);
    }

    function handleNext() {
        if (assets.length === 0 || (assets.length === 1 && !assets[0].name.trim())) {
            setListError('At least one asset is required');
            return;
        }
        const errs = validateAll(assets);
        setErrors(errs);
        const hasErrors = errs.some((e) => Object.keys(e).length > 0);
        if (!hasErrors) {
            setListError('');
            onNext();
        }
    }

    return (
        <div className="step-container">
            <h2>Assets</h2>
            <p className="step-description">Define the physical assets in your plant.</p>

            {listError && <div className="error-banner">{listError}</div>}

            {assets.map((asset, i) => (
                <div key={i} className="asset-card">
                    <div className="asset-card-header">
                        <span className="asset-index">Asset {i + 1}</span>
                        {assets.length > 1 && (
                            <button className="btn-icon-remove" onClick={() => removeAsset(i)} title="Remove asset">
                                ✕
                            </button>
                        )}
                    </div>
                    <div className="form-row">
                        <div className="form-group half">
                            <label>Name *</label>
                            <input
                                type="text"
                                value={asset.name}
                                onChange={(e) => updateAsset(i, 'name', e.target.value)}
                                className={errors[i]?.name ? 'input-error' : ''}
                                placeholder="e.g. boiler_1"
                            />
                            {errors[i]?.name && <span className="error-msg">{errors[i].name}</span>}
                        </div>
                        <div className="form-group half">
                            <label>Display Name *</label>
                            <input
                                type="text"
                                value={asset.display_name}
                                onChange={(e) => updateAsset(i, 'display_name', e.target.value)}
                                className={errors[i]?.display_name ? 'input-error' : ''}
                                placeholder="e.g. Main Boiler"
                            />
                            {errors[i]?.display_name && <span className="error-msg">{errors[i].display_name}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select value={asset.type} onChange={(e) => updateAsset(i, 'type', e.target.value)}>
                            {ASSET_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            ))}

            <button className="btn-secondary" onClick={addAsset}>
                + Add Asset
            </button>

            <div className="step-actions">
                <button className="btn-outline" onClick={onBack}>
                    ← Back
                </button>
                <button className="btn-primary" onClick={handleNext}>
                    Next →
                </button>
            </div>
        </div>
    );
}
