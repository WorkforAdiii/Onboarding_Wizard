import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const WizardContext = createContext(null);
const STORAGE_KEY = 'latspace_wizard_state';

const initialState = {
    currentStep: 0,
    plant: { name: '', description: '', address: '', manager_email: '' },
    assets: [],
    parameters: [],
    formulas: [],
    templateName: '',
    submitted: false,
};

function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...initialState, ...parsed, submitted: false };
        }
    } catch {
    }
    return initialState;
}

function reducer(state, action) {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'SET_PLANT':
            return { ...state, plant: { ...state.plant, ...action.payload } };
        case 'SET_ASSETS':
            return { ...state, assets: action.payload };
        case 'SET_PARAMETERS':
            return { ...state, parameters: action.payload };
        case 'SET_FORMULAS':
            return { ...state, formulas: action.payload };
        case 'SET_TEMPLATE_NAME':
            return { ...state, templateName: action.payload };
        case 'SET_SUBMITTED':
            return { ...state, submitted: true };
        case 'LOAD_STATE':
            return { ...initialState, ...action.payload, submitted: false };
        case 'RESET':
            localStorage.removeItem(STORAGE_KEY);
            return initialState;
        default:
            return state;
    }
}

export function WizardProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, null, loadFromStorage);

    useEffect(() => {
        if (!state.submitted) {
            const toSave = { ...state };
            delete toSave.submitted;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        }
    }, [state]);

    const setStep = useCallback((step) => dispatch({ type: 'SET_STEP', payload: step }), []);
    const setPlant = useCallback((data) => dispatch({ type: 'SET_PLANT', payload: data }), []);
    const setAssets = useCallback((data) => dispatch({ type: 'SET_ASSETS', payload: data }), []);
    const setParameters = useCallback((data) => dispatch({ type: 'SET_PARAMETERS', payload: data }), []);
    const setFormulas = useCallback((data) => dispatch({ type: 'SET_FORMULAS', payload: data }), []);
    const setTemplateName = useCallback((name) => dispatch({ type: 'SET_TEMPLATE_NAME', payload: name }), []);
    const setSubmitted = useCallback(() => dispatch({ type: 'SET_SUBMITTED' }), []);
    const loadState = useCallback((data) => dispatch({ type: 'LOAD_STATE', payload: data }), []);
    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    const value = {
        state,
        setStep,
        setPlant,
        setAssets,
        setParameters,
        setFormulas,
        setTemplateName,
        setSubmitted,
        loadState,
        reset,
    };

    return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
    const ctx = useContext(WizardContext);
    if (!ctx) throw new Error('useWizard must be used within WizardProvider');
    return ctx;
}
