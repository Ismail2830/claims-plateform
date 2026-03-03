"""
train.py — Risk Scoring Model Training
Moroccan Insurance Platform — ISM Assurance

Trains a GradientBoostingClassifier on sinistres_sample.csv
and saves the model + label encoder to disk.
"""

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "data", "sinistres_sample.csv")
MODEL_PATH = os.path.join(BASE_DIR, "risk_scoring_model.pkl")
ENC_PATH   = os.path.join(BASE_DIR, "label_encoder.pkl")

# ─── Label assignment (matches spec exactly) ──────────────────────────────────
def assign_label(row: pd.Series) -> int:
    """
    Assign a numeric risk label based on business rules.
    0=Faible | 1=Moyen | 2=Élevé | 3=Suspicieux
    """
    if row["delai_declaration"] > 30 or row["nb_sinistres_passes"] > 5:
        return 3  # Suspicieux
    elif row["montant_declare"] > 50000 or row["historique_score"] > 100:
        return 2  # Élevé
    elif row["montant_declare"] > 10000 or row["nb_sinistres_passes"] > 2:
        return 1  # Moyen
    else:
        return 0  # Faible


# ─── Load data ────────────────────────────────────────────────────────────────
print("📂 Loading data from:", DATA_PATH)
df = pd.read_csv(DATA_PATH, parse_dates=["date_incident", "date_declaration"])
print(f"   {len(df)} rows loaded.\n")

# ─── Feature engineering ──────────────────────────────────────────────────────

# 1. delai_declaration: days between incident and declaration
df["delai_declaration"] = (
    df["date_declaration"] - df["date_incident"]
).dt.days.clip(lower=0)

# 2. historique_score: nb_sinistres_passes × (montant_total_passe / (anciennete + 1))
df["historique_score"] = df["nb_sinistres_passes"] * (
    df["montant_total_passe"] / (df["anciennete_annees"] + 1)
)

# 3. type_sinistre_encoded: LabelEncoder  AUTO=0 HOME=1 HEALTH=2 LIFE=3 CONSTRUCTION=4
type_encoder = LabelEncoder()
df["type_sinistre_encoded"] = type_encoder.fit_transform(df["type_sinistre"])
print("🔤 Type encoding:")
for cls, idx in zip(type_encoder.classes_, range(len(type_encoder.classes_))):
    print(f"   {cls} → {idx}")
print()

# 4. Assign labels
df["label"] = df.apply(assign_label, axis=1)

# ─── Feature matrix ───────────────────────────────────────────────────────────
FEATURES = [
    "montant_declare",
    "type_sinistre_encoded",
    "delai_declaration",
    "historique_score",
]

X = df[FEATURES].values
y = df["label"].values

# Distribution check
label_names = ["Faible", "Moyen", "Élevé", "Suspicieux"]
print("📊 Label distribution:")
unique, counts = np.unique(y, return_counts=True)
for u, c in zip(unique, counts):
    print(f"   {label_names[u]:<12} {c:>4} ({c/len(y)*100:.1f}%)")
print()

# ─── Train / test split (80/20, stratified) ───────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"🔀 Train: {len(X_train)} rows  |  Test: {len(X_test)} rows\n")

# ─── Train model ──────────────────────────────────────────────────────────────
print("⚙️  Training GradientBoostingClassifier ...")
model = GradientBoostingClassifier(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.1,
    random_state=42,
)
model.fit(X_train, y_train)
print("   Training complete.\n")

# ─── Evaluation ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)
print("📋 Classification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=label_names,
        zero_division=0,
    )
)

# ─── Feature importances ──────────────────────────────────────────────────────
print("🔍 Feature importances (descending):")
importances = model.feature_importances_
sorted_idx  = np.argsort(importances)[::-1]
for i in sorted_idx:
    print(f"   {FEATURES[i]:<28} {importances[i]:.4f}")
print()

# ─── Save artifacts ───────────────────────────────────────────────────────────
joblib.dump(model,        MODEL_PATH)
joblib.dump(type_encoder, ENC_PATH)
print(f"💾 Model saved   → {MODEL_PATH}")
print(f"💾 Encoder saved → {ENC_PATH}")
print("\n✅ Model trained and saved!")
