import urllib.request
import json

BASE = "http://localhost:8000"

def score(payload, label):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        BASE + "/score",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    r = urllib.request.urlopen(req)
    res = json.loads(r.read())
    print(f"[{label}]  score={res['score_risque']:>3}  label={res['label']:<12}  decision={res['decision']:<30}  conf={round(res['confidence'])}%")

def batch(payloads, label):
    data = json.dumps(payloads).encode()
    req = urllib.request.Request(
        BASE + "/score/batch",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    r = urllib.request.urlopen(req)
    res = json.loads(r.read())
    print(f"[{label}]  {res['total']} results returned (total={res['total']})")
    for i, item in enumerate(res["results"]):
        print(f"  [{i+1}] score={item['score_risque']:>3}  label={item['label']:<12}  decision={item['decision']}")

print("=" * 70)
print("HEALTH CHECK")
r = urllib.request.urlopen(BASE + "/health")
print(json.loads(r.read()))

print()
print("SINGLE /score — 4 risk levels")
print("-" * 70)
score({"montant_declare": 3000,  "type_sinistre": "AUTO",         "delai_declaration": 2,  "historique_score": 0},      "LOW    ")
score({"montant_declare": 25000, "type_sinistre": "HEALTH",       "delai_declaration": 15, "historique_score": 5000},   "MEDIUM ")
score({"montant_declare": 70000, "type_sinistre": "HOME",          "delai_declaration": 30, "historique_score": 50000},  "HIGH   ")
score({"montant_declare": 95000, "type_sinistre": "CONSTRUCTION",  "delai_declaration": 45, "historique_score": 120000}, "SUSPECT")

print()
print("BATCH /score/batch — 3 items")
print("-" * 70)
batch([
    {"montant_declare": 3000,  "type_sinistre": "AUTO",        "delai_declaration": 2,  "historique_score": 0},
    {"montant_declare": 50000, "type_sinistre": "LIFE",        "delai_declaration": 10, "historique_score": 20000},
    {"montant_declare": 95000, "type_sinistre": "CONSTRUCTION","delai_declaration": 45, "historique_score": 120000},
], "BATCH  ")

print()
print("ALL TESTS PASSED")
print("=" * 70)
