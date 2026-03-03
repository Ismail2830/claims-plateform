"""
main.py — Risk Scoring FastAPI Microservice
Moroccan Insurance Platform — ISM Assurance

Endpoints:
  GET  /health        → service health check
  POST /score         → score a single sinistre
  POST /score/batch   → score a list of sinistres
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from predict import predict_risk, RiskResult

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ISM Assurance — Risk Scoring API",
    description="GradientBoosting ML model for sinistre risk scoring",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ──────────────────────────────────────────────────────────
class SinistreInput(BaseModel):
    """Input features for a single sinistre risk scoring request."""
    montant_declare:   float = Field(..., gt=0,  description="Montant déclaré en MAD")
    type_sinistre:     Literal["AUTO", "HOME", "HEALTH", "LIFE", "CONSTRUCTION"]
    delai_declaration: int   = Field(..., ge=0,  description="Jours entre incident et déclaration")
    historique_score:  float = Field(..., ge=0,  description="nb_sinistres × (montant_total / (anciennete + 1))")

    model_config = {
        "json_schema_extra": {
            "example": {
                "montant_declare":   25000.0,
                "type_sinistre":     "AUTO",
                "delai_declaration": 5,
                "historique_score":  40.0,
            }
        }
    }


class SinistreScoreResponse(BaseModel):
    """Risk scoring result for a single sinistre."""
    score_risque: int
    label:        str
    confidence:   float
    decision:     str


class BatchScoreResponse(BaseModel):
    """Risk scoring results for a batch of sinistres."""
    results: list[SinistreScoreResponse]
    total:   int


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Monitoring"])
def health_check() -> dict:
    """Service health check — returns status ok if model is loaded."""
    return {"status": "ok", "model": "GradientBoostingClassifier v1.0"}


@app.post("/score", response_model=SinistreScoreResponse, tags=["Scoring"])
def score_sinistre(payload: SinistreInput) -> SinistreScoreResponse:
    """
    Score a single sinistre declaration for risk/fraud.

    Returns a risk score (0-100), label, confidence %, and IA decision.
    """
    try:
        result: RiskResult = predict_risk(
            montant=payload.montant_declare,
            type_sinistre=payload.type_sinistre,
            delai=payload.delai_declaration,
            historique=payload.historique_score,
        )
        return SinistreScoreResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du scoring: {str(e)}",
        )


@app.post("/score/batch", response_model=BatchScoreResponse, tags=["Scoring"])
def score_batch(payload: list[SinistreInput]) -> BatchScoreResponse:
    """
    Score a batch of sinistre declarations.

    Accepts a list of sinistres and returns a scored result for each.
    """
    if not payload:
        raise HTTPException(
            status_code=422,
            detail="La liste de sinistres ne peut pas être vide.",
        )
    if len(payload) > 500:
        raise HTTPException(
            status_code=422,
            detail="Le batch ne peut pas dépasser 500 sinistres.",
        )

    results = []
    for item in payload:
        try:
            result: RiskResult = predict_risk(
                montant=item.montant_declare,
                type_sinistre=item.type_sinistre,
                delai=item.delai_declaration,
                historique=item.historique_score,
            )
            results.append(SinistreScoreResponse(**result))
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors du scoring d'un sinistre: {str(e)}",
            )

    return BatchScoreResponse(results=results, total=len(results))
