/**
 * API client for communicating with the LatSpace backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(url, options = {}) {
    const res = await fetch(`${BASE_URL}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

export function fetchParameters(assetType) {
    const query = assetType ? `?asset_type=${encodeURIComponent(assetType)}` : '';
    return request(`/parameters${query}`);
}

export function validateFormula(expression, enabledParameters) {
    return request('/formulas/validate', {
        method: 'POST',
        body: JSON.stringify({ expression, enabled_parameters: enabledParameters }),
    });
}

export function submitOnboarding(payload) {
    return request('/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export function saveTemplate(name, data) {
    return request('/templates', {
        method: 'POST',
        body: JSON.stringify({ name, data }),
    });
}

export function loadTemplate(name) {
    return request(`/templates/${encodeURIComponent(name)}`);
}

export function listTemplates() {
    return request('/templates');
}

export function listSubmissions() {
    return request('/submissions');
}

export function getSubmission(id) {
    return request(`/submissions/${encodeURIComponent(id)}`);
}

export function deleteSubmission(id) {
    return request(`/submissions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
