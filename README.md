# Onboarding Wizard

A dynamic, multi-step React + FastAPI onboarding application designed to configure industrial plant assets, operational parameters, and calculated formulas.

## Features

- **Multi-Step Configuration:** Seamlessly collect Plant Information, Assets, Parameters, and Formulas.
- **Dynamic Parameter Filtering:** Parameters are context-aware, filtering based on the specific assets added in earlier steps.
- **Formula Autocompletion:** A syntax-highlighted input field suggests available parameters to build real-time formulas with validation against circular dependencies.
- **Template Management:** Save frequent configurations as reusable templates that can be loaded straight from the UI.
- **JSON Export & Persistence:** Review configurations before final submission, download the output JSON locally, or track past submissions directly within the dashboard.

## Tech Stack

### Frontend
- **React.js** (Vite)
- **Context API** for global wizard state management
- Custom CSS styling with a responsive, modern dark theme.

### Backend
- **FastAPI** (Python 3.11+)
- **Pydantic** for rigorous data validation and schema definitions
- **Uvicorn** for asgi server housing

## Running the Application

### 1. Backend Setup
Navigate into the `backend` directory, install dependencies, and run the server:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The backend API will be available at `http://localhost:8000`.

### 2. Frontend Setup
Navigate into the `frontend` directory, install dependencies, and run the development server:

```bash
cd frontend
npm install
npm run dev
```
The frontend application will be available at `http://localhost:5173`.

## Data Model

The application relies on a `parameter_registry.json` acting as the single source of truth for inputs, outputs, and emission factors. Parameters define which asset types they belong to, ensuring the frontend only asks operators for relevant data points.
