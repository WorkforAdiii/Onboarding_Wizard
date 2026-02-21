import { useState, useEffect } from 'react';
import { useWizard } from '../WizardContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(plant) {
    const errors = {};
    if (!plant.name.trim()) errors.name = 'Plant name is required';
    if (!plant.address.trim()) errors.address = 'Address is required';
    if (!plant.manager_email.trim()) errors.manager_email = 'Email is required';
    else if (!EMAIL_RE.test(plant.manager_email)) errors.manager_email = 'Invalid email format';
    return errors;
}

export default function PlantInfoStep({ onNext }) {
    const { state, setPlant } = useWizard();
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        if (Object.keys(touched).length > 0) {
            setErrors(validate(state.plant));
        }
    }, [state.plant, touched]);

    function handleChange(field, value) {
        setPlant({ [field]: value });
        setTouched((t) => ({ ...t, [field]: true }));
    }

    function handleBlur(field) {
        setTouched((t) => ({ ...t, [field]: true }));
        setErrors(validate(state.plant));
    }

    function handleNext() {
        const errs = validate(state.plant);
        setErrors(errs);
        setTouched({ name: true, address: true, manager_email: true });
        if (Object.keys(errs).length === 0) onNext();
    }

    return (
        <div className="step-container">
            <h2>Plant Information</h2>
            <p className="step-description">Enter the basic details about your plant facility.</p>

            <div className="form-group">
                <label htmlFor="plant-name">Plant Name *</label>
                <input
                    id="plant-name"
                    type="text"
                    value={state.plant.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    className={touched.name && errors.name ? 'input-error' : ''}
                    placeholder="e.g. Northfield Thermal Plant"
                />
                {touched.name && errors.name && <span className="error-msg">{errors.name}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="plant-description">Description</label>
                <textarea
                    id="plant-description"
                    value={state.plant.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Optional description of the plant"
                    rows={3}
                />
            </div>

            <div className="form-group">
                <label htmlFor="plant-address">Address *</label>
                <input
                    id="plant-address"
                    type="text"
                    value={state.plant.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    className={touched.address && errors.address ? 'input-error' : ''}
                    placeholder="e.g. 420 Industrial Blvd, Suite 100"
                />
                {touched.address && errors.address && <span className="error-msg">{errors.address}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="plant-email">Manager Email *</label>
                <input
                    id="plant-email"
                    type="email"
                    value={state.plant.manager_email}
                    onChange={(e) => handleChange('manager_email', e.target.value)}
                    onBlur={() => handleBlur('manager_email')}
                    className={touched.manager_email && errors.manager_email ? 'input-error' : ''}
                    placeholder="e.g. manager@company.com"
                />
                {touched.manager_email && errors.manager_email && (
                    <span className="error-msg">{errors.manager_email}</span>
                )}
            </div>

            <div className="step-actions">
                <div />
                <button className="btn-primary" onClick={handleNext}>
                    Next →
                </button>
            </div>
        </div>
    );
}
