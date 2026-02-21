import { useState, useEffect } from 'react';
import { useWizard } from './WizardContext';
import PlantInfoStep from './components/PlantInfoStep';
import AssetsStep from './components/AssetsStep';
import ParametersStep from './components/ParametersStep';
import FormulasStep from './components/FormulasStep';
import ReviewStep from './components/ReviewStep';

const STEPS = [
  { label: 'Plant Info', component: PlantInfoStep },
  { label: 'Assets', component: AssetsStep },
  { label: 'Parameters', component: ParametersStep },
  { label: 'Formulas', component: FormulasStep },
  { label: 'Review', component: ReviewStep },
];

const THEME_KEY = 'latspace_theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

function ProgressBar({ current, steps, onJumpTo }) {
  return (
    <div className="progress-bar">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`progress-step ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}
          onClick={() => i < current && onJumpTo(i)}
          role="button"
          tabIndex={i < current ? 0 : -1}
        >
          <div className="progress-circle">
            {i < current ? '✓' : i + 1}
          </div>
          <span className="progress-label">{s.label}</span>
        </div>
      ))}
      <div className="progress-line-bg">
        <div
          className="progress-line-fill"
          style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { state, setStep } = useWizard();
  const { currentStep } = state;
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const goNext = () => setStep(Math.min(currentStep + 1, STEPS.length - 1));
  const goBack = () => setStep(Math.max(currentStep - 1, 0));
  const jumpTo = (step) => setStep(step);

  const StepComponent = STEPS[currentStep].component;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">LatSpace</span>
        </div>
        <div className="header-right">
          <span className="header-subtitle">Onboarding Wizard</span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <ProgressBar current={currentStep} steps={STEPS} onJumpTo={jumpTo} />
        <div className="step-wrapper">
          <StepComponent onNext={goNext} onBack={goBack} onJumpTo={jumpTo} />
        </div>
      </main>

      <footer className="app-footer">
        <span>LatSpace &copy; 2026 — Industrial Process Intelligence</span>
      </footer>
    </div>
  );
}
