# 🛡️ Claims Platform — Plateforme d'Assurance Intelligente

> Une plateforme d'assurance moderne, intégrée à l'Intelligence Artificielle, permettant la déclaration en ligne de sinistres, le suivi des dossiers, le scoring des risques et la prise de décision assistée par IA.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-darkblue?logo=prisma)
![Python](https://img.shields.io/badge/Python-ML%20Service-yellow?logo=python)
![License](https://img.shields.io/badge/License-Private-red)

---

## 📋 Table des Matières

- [Aperçu du Projet](#-aperçu-du-projet)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Stack Technique](#-stack-technique)
- [Structure du Projet](#-structure-du-projet)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration des Variables d'Environnement](#-configuration-des-variables-denvironnement)
- [Lancement en Développement](#-lancement-en-développement)
- [Base de Données](#-base-de-données)
- [Service ML (IA)](#-service-ml-ia)
- [Déploiement](#-déploiement)
- [Rôles Utilisateurs](#-rôles-utilisateurs)
- [Contribuer](#-contribuer)

---

## 🌟 Aperçu du Projet

**Claims Platform** est une solution complète de gestion de sinistres d'assurance, conçue pour digitaliser et automatiser le cycle de vie d'un dossier de réclamation. Elle combine une interface web moderne avec un moteur d'IA intégré pour le scoring de risques et l'aide à la décision.

### Cas d'usage principaux :
- 📝 Déclaration en ligne de sinistres par les assurés
- 📂 Suivi en temps réel de l'état des dossiers
- 🤖 Scoring automatique des risques par IA
- 👥 Gestion multi-rôles : Client, Gestionnaire, Administrateur
- 🧠 Décision assistée par IA pour les gestionnaires
- 📊 Dashboards et reporting avancés

---

## ✨ Fonctionnalités

### 📝 Déclaration en Ligne
- Formulaire de déclaration de sinistre intuitif
- Upload de documents justificatifs (via Vercel Blob)
- Confirmation et suivi par e-mail (Resend) et SMS (Twilio)
- Notifications en temps réel (Pusher)

### 📂 Suivi des Dossiers
- Interface de suivi de l'avancement des dossiers
- Historique complet des actions et décisions
- Mise à jour en temps réel via WebSockets (Pusher)
- Export PDF des dossiers

### 🤖 Scoring des Risques (IA)
- Calcul automatique du score de risque via un modèle ML (Random Forest)
- Intégration d'un micro-service Python (FastAPI)
- Prédiction basée sur les données du sinistre
- Résultats disponibles directement dans l'interface gestionnaire

### 👥 Rôles et Gestion des Accès
| Rôle | Accès |
|------|-------|
| **Client** | Déclaration de sinistres, suivi de ses dossiers |
| **Gestionnaire** | Traitement des dossiers, décision assistée par IA |
| **Administrateur** | Gestion complète, utilisateurs, reporting |

### 🧠 Décision Assistée par IA
- Recommandation automatique basée sur le score de risque
- Analyse contextuelle via OpenAI GPT
- Aide à la validation ou rejet d'un dossier

### 📊 Dashboards & Reporting
- Tableaux de bord par rôle
- Statistiques de sinistres (Recharts)
- Export Excel (ExcelJS)
- Export PDF des rapports

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                  │
│  React 19 • TypeScript • Tailwind CSS • Radix UI         │
│  tRPC • React Query • Framer Motion • next-intl          │
└────────────────────────┬────────────────────────────────┘
                         │
             ┌───────────┴───────────┐
             │                       │
┌────────────▼──────────┐  ┌────────▼────────────────────┐
│    API Layer (tRPC)    │  │    ML Service (Python)       │
│  Next.js API Routes   │  │  FastAPI • Scikit-learn       │
│  JWT Auth • Prisma    │  │  Random Forest Model         │
│  PostgreSQL • Redis   │  │  Docker Container            │
└────────────┬──────────┘  └─────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────┐
│              Services Tiers                            │
│  OpenAI • Pusher • Resend • Twilio • Vercel Blob       │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Technique

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 16 | Framework React SSR/SSG |
| React | 19 | Interface utilisateur |
| TypeScript | 5 | Typage statique |
| Tailwind CSS | 4 | Styles utilitaires |
| Radix UI | Latest | Composants accessibles |
| Framer Motion | 12 | Animations |
| Recharts | 3 | Graphiques et dashboards |
| next-intl | 4 | Internationalisation (i18n) |

### Backend & API
| Technologie | Version | Usage |
|-------------|---------|-------|
| tRPC | 11 | API type-safe end-to-end |
| Prisma | 7 | ORM base de données |
| PostgreSQL | - | Base de données principale |
| Redis (ioredis) | 5 | Cache et sessions |
| Pusher | 5 | Temps réel / WebSockets |
| JWT / Jose | 6 | Authentification |
| bcryptjs | 3 | Hashage des mots de passe |

### Services Externes
| Service | Usage |
|---------|-------|
| OpenAI | Décision assistée par IA (GPT) |
| Resend | Envoi d'e-mails transactionnels |
| Twilio | Notifications SMS |
| Vercel Blob | Stockage de fichiers |

### Service ML (Python)
| Technologie | Usage |
|-------------|-------|
| FastAPI | API REST pour le modèle ML |
| Scikit-learn | Modèle de scoring (Random Forest) |
| Docker | Conteneurisation du service |

---

## 📁 Structure du Projet

```
claims-plateform/
├── app/                    # Pages et routes Next.js (App Router)
├── components/             # Composants React réutilisables
├── constants/              # Constantes de l'application
├── lib/                    # Utilitaires et configuration
├── messages/               # Fichiers de traduction (i18n)
├── ml-service/             # Micro-service IA (Python)
│   ├── main.py             # API FastAPI
│   ├── train.py            # Entraînement du modèle ML
│   ├── predict.py          # Logique de prédiction
│   ├── risk_scoring_model.pkl  # Modèle entraîné
│   ├── label_encoder.pkl   # Encodeur de labels
│   ├── requirements.txt    # Dépendances Python
│   └── Dockerfile          # Image Docker du service ML
├── prisma/
│   ├── schema.prisma       # Schéma de la base de données
│   ├── seed.sql            # Données initiales
│   └── migrations/         # Migrations de base de données
├── public/                 # Assets statiques
├── scripts/                # Scripts utilitaires
├── types/                  # Types TypeScript globaux
├── i18n.config.ts          # Configuration de l'internationalisation
├── next.config.ts          # Configuration Next.js
├── render.yaml             # Configuration déploiement Render
├── vercel.json             # Configuration déploiement Vercel
└── DEPLOYMENT.md           # Guide de déploiement détaillé
```

---

## ✅ Prérequis

- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** >= 14
- **Redis** >= 7
- **Python** >= 3.10 (pour le service ML)
- **Docker** (optionnel, pour le service ML)

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Ismail2830/claims-plateform.git
cd claims-plateform
```

### 2. Installer les dépendances Node.js

```bash
npm install
```

### 3. Installer les dépendances Python (service ML)

```bash
cd ml-service
pip install -r requirements.txt
cd ..
```

---

## ⚙️ Configuration des Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/claims_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentification JWT
JWT_SECRET="your-super-secret-jwt-key"

# OpenAI
OPENAI_API_KEY="sk-..."

# Pusher (Temps réel)
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# Resend (E-mails)
RESEND_API_KEY="re_..."

# Twilio (SMS)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Vercel Blob (Fichiers)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# ML Service URL
ML_SERVICE_URL="http://localhost:8000"
```

---

## 💻 Lancement en Développement

### Démarrer l'application Next.js

```bash
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

### Démarrer le service ML

```bash
cd ml-service
uvicorn main:app --reload --port 8000
```

Ou avec Docker :

```bash
cd ml-service
docker build -t ml-service .
docker run -p 8000:8000 ml-service
```

---

## 🗄️ Base de Données

### Pousser le schéma vers la base de données

```bash
npm run db:push
```

### Créer et appliquer une migration

```bash
npm run db:migrate
```

### Ouvrir Prisma Studio (interface visuelle)

```bash
npm run db:studio
```

### Initialiser les données de base

```bash
psql -d claims_db -f prisma/seed.sql
```

---

## 🤖 Service ML (IA)

Le service ML est un micro-service Python indépendant basé sur **FastAPI** et **Scikit-learn**.

### Entraîner le modèle

```bash
cd ml-service
python train.py
```

### Tester l'API ML

```bash
cd ml-service
python test_api.py
```

### Endpoints ML disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/predict` | Calculer le score de risque d'un sinistre |
| `GET` | `/health` | Vérifier l'état du service |

---

## 🚢 Déploiement

Ce projet supporte plusieurs plateformes de déploiement. Consultez le fichier [DEPLOYMENT.md](./DEPLOYMENT.md) pour les instructions complètes.

### Vercel (Frontend recommandé)

```bash
npm run vercel-build
```

La configuration se trouve dans `vercel.json`.

### Render (Full-stack)

La configuration se trouve dans `render.yaml` (inclut le service Next.js et le service ML Python).

---

## 👥 Rôles Utilisateurs

### 🧑 Client (Assuré)
- Création d'un compte et connexion sécurisée
- Déclaration de sinistres en ligne avec upload de documents
- Suivi de l'état de ses dossiers en temps réel
- Réception de notifications (e-mail / SMS)

### 🧑‍💼 Gestionnaire
- Consultation et traitement des dossiers assignés
- Accès au score de risque IA pour chaque dossier
- Décision assistée par IA (validation / rejet / demande de pièces)
- Communication avec les assurés

### 🔧 Administrateur
- Gestion des utilisateurs et des rôles
- Accès aux dashboards et reporting global
- Configuration de la plateforme
- Export de données (Excel / PDF)

---

## 🌍 Internationalisation

La plateforme supporte plusieurs langues grâce à **next-intl**. Les fichiers de traduction se trouvent dans le répertoire `messages/`.

```
messages/
├── fr.json    # Français
├── ar.json    # Arabe
└── en.json    # Anglais
```

---

## 🤝 Contribuer

1. Forkez le projet
2. Créez votre branche feature : `git checkout -b feature/ma-fonctionnalite`
3. Committez vos changements : `git commit -m 'feat: ajout de ma fonctionnalité'`
4. Poussez la branche : `git push origin feature/ma-fonctionnalite`
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est privé. Tous droits réservés © 2026 — [Ismail2830](https://github.com/Ismail2830).

---

<div align="center">
  <strong>Fait avec ❤️ pour moderniser la gestion des sinistres d'assurance</strong>
</div>