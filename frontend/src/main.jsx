import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { WizardProvider } from './WizardContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WizardProvider>
      <App />
    </WizardProvider>
  </StrictMode>,
);
