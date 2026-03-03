"""
predict.py — Risk Scoring Prediction Module
Moroccan Insurance Platform — ISM Assurance

Loads trained model + encoder at module level (singleton pattern)
and exposes predict_risk() for use by the FastAPI service.
"""

import os
from typing import TypedDict, Literal
import numpy as np
import joblib

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "risk_scoring_model.pkl")
ENC_PATH   = os.path.join(BASE_DIR, "label_encoder.pkl")

# ─── Load artifacts once at module level (not per request) ───────────────────
_model        = joblib.load(MODEL_PATH)
_type_encoder = joblib.load(ENC_PATH)

# ─── Score weights matching label indices 0=Faible 1=Moyen 2=Élevé 3=Suspicieux
_SCORE_WEIGHTS = [0, 33, 66, 100]

# ─── Output types ─────────────────────────────────────────────────────────────
RiskLabel    = Literal["Faible", "Moyen", "Élevé", "Suspicieux"]
DecisionType = Literal["Auto-approuver", "Révision manuelle", "Escalader / Enquête"]

class RiskResult(TypedDict):
    score_risque: int
    label:        RiskLabel
    confidence:   float
    decision:     DecisionType


# ─── Helpers ──────────────────────────────────────────────────────────────────
_LABEL_NAMES: list[RiskLabel] = ["Faible", "Moyen", "Élevé", "Suspicieux"]


def _score_to_label(score: int) -> RiskLabel:
    """Map a 0-100 score to a human-readable risk label."""
    if score <= 30:
        return "Faible"
    elif score <= 60:
        return "Moyen"
    elif score <= 80:
        return "Élevé"
    else:
        return "Suspicieux"


def _score_to_decision(score: int) -> DecisionType:
    """Map a 0-100 score to an IA decision recommendation."""
    if score < 30:
        return "Auto-approuver"
    elif score < 65:
        return "Révision manuelle"
    else:
        return "Escalader / Enquête"


# ─── Main prediction function ─────────────────────────────────────────────────
def predict_risk(
    montant: float,
    type_sinistre: str,
    delai: int,
    historique: float,
) -> RiskResult:
    """
    Score a sinistre declaration for fraud/risk.

    Args:
        montant:       Declared amount in MAD (> 0).
        type_sinistre: Policy type — "AUTO" | "HOME" | "HEALTH" | "LIFE" | "CONSTRUCTION".
        delai:         Days between date_incident and date_declaration (>= 0).
        historique:    nb_sinistres_passes × (montant_total_passe / (anciennete + 1)).

    Returns:
        RiskResult dict with score_risque (0-100), label, confidence (%), decision.
    """
    # Encode type_sinistre — fall back to 0 (AUTO) for unknown values
    try:
        type_encoded = int(_type_encoder.transform([type_sinistre.upper()])[0])
    except ValueError:
        type_encoded = 0

    features = np.array([[montant, type_encoded, delai, historique]], dtype=float)

    # predict_proba returns shape (1, n_classes)
    proba: np.ndarray = _model.predict_proba(features)[0]

    # Weighted score: Σ(p_i × w_i) where weights = [0, 33, 66, 100]
    score_raw = float(np.dot(proba, _SCORE_WEIGHTS[:len(proba)]))
    score     = int(round(score_raw))
    score     = max(0, min(100, score))  # clamp to [0, 100]

    # Confidence = probability of the predicted class × 100
    confidence = round(float(proba.max()) * 100, 1)

    return RiskResult(
        score_risque=score,
        label=_score_to_label(score),
        confidence=confidence,
        decision=_score_to_decision(score),
    )


# ─── Quick smoke test ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        # (montant,   type,           delai, historique,  expected_label)
        (5000.0,    "AUTO",          3,     0.0,          "Faible"),
        (25000.0,   "HOME",          10,    50.0,         "Moyen"),
        (75000.0,   "LIFE",          15,    80.0,         "Élevé"),
        (15000.0,   "HEALTH",        45,    0.0,          "Suspicieux"),  # late
        (10000.0,   "CONSTRUCTION",  5,     0.0,          "Faible"),
        (5000.0,    "INVALID_TYPE",  2,     0.0,          "Faible"),      # unknown type
    ]

    print(f"{'Montant':>10}  {'Type':<14} {'Delai':>5}  {'Hist':>7}  "
          f"{'Score':>5}  {'Label':<12} {'Conf':>6}  Decision")
    print("─" * 90)
    for montant, t, delai, hist, expected in tests:
        r = predict_risk(montant, t, delai, hist)
        ok = "✅" if r["label"] == expected else "⚠️ "
        print(
            f"{montant:>10,.0f}  {t:<14} {delai:>5}  {hist:>7.1f}  "
            f"{r['score_risque']:>5}  {r['label']:<12} {r['confidence']:>5.1f}%  "
            f"{r['decision']}  {ok}"
        )
