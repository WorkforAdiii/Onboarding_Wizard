import { useContext } from 'react';
import { WizardContext } from './WizardContextDef';

export function useWizard() {
    const ctx = useContext(WizardContext);
    if (!ctx) throw new Error('useWizard must be used within WizardProvider');
    return ctx;
}
