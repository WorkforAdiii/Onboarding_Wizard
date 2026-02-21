"""FastAPI application entry point for the LatSpace onboarding wizard."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import parameters, formulas, onboarding, templates

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="LatSpace Onboarding API",
    description="Backend API for the LatSpace multi-step onboarding wizard",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parameters.router)
app.include_router(formulas.router)
app.include_router(onboarding.router)
app.include_router(templates.router)


@app.get("/api/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
