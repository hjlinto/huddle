# 🏈 Football Prediction Pipeline API

An API-first football prediction platform that ingests weekly game + odds data, allows authenticated users to submit picks (winner / spread / total), and grades predictions after final scores are uploaded. This project is intentionally **backend-forward**, showcasing REST API design, relational modeling, ingestion workflows, and production-ready patterns more than frontend aesthetics.

---

## Live Demo

[Check out the deployed app](https://nfl-prediction-pipeline.vercel.app/login)

---

## Features

- **JWT Authentication + User Isolation**
  - Secure login/signup
  - Auth-protected endpoints
  - User-scoped access to picks and stats

- **Game, Odds, and Results Pipeline**
  - Weekly ingestion of games and betting lines (spread/total) via CSV
  - Manual score ingestion to finalize games when live APIs aren’t available

- **Prediction Submission**
  - Users can submit picks for:
    - Predicted winner (home/away)
    - Spread outcome (home/away ATS)
    - Total outcome (over/under)
  - Validations prevent duplicate picks and invalid payloads

- **Automated Grading**
  - Grades each pick type once games are marked final
  - Stores correctness outcomes and enables later analytics

- **User Stats & Performance Tracking**
  - Season-based summaries and overall accuracy
  - Breakdown by pick category (winner / spread / total)

- **Deployment-Friendly API**
  - Environment-based configuration
  - Clear error handling and consistent JSON responses

---

## Developer Contributions

This project was independently designed and implemented with a strong emphasis on backend engineering:

- Designed a **PostgreSQL relational schema** to model:
  - Users
  - Games (season, week, teams, date)
  - Odds (spread, total)
  - Predictions (user picks)
  - Results/grading outputs (correctness per pick type)
- Built a **REST API** to support:
  - Authentication and secure access control
  - CRUD-style interactions for games/picks where appropriate
  - User-centric endpoints for stats and “my picks”
- Implemented **CSV ingestion workflows** to:
  - Load weekly schedules and betting lines
  - Update final scores and mark games as completed
- Implemented **grading logic** that:
  - Compares user picks vs final outcomes
  - Handles edge cases like missing odds, incomplete games, and push scenarios
- Ensured local/deployed parity via:
  - Configurable environment variables
  - CORS-safe patterns for frontend integration
  - Clean routing and predictable API behavior
- Deployed a production-ready, multi-service architecture:
  - Backend API hosted on Render with environment-based configuration
  - PostgreSQL database provisioned via Render and accessed securely via connection strings
  - Frontend deployed on Vercel and integrated via CORS-safe API communication

---

## Technologies and Tools Used

- **Python** (backend application logic)
- **Flask** (REST API)
- **PostgreSQL** (persistent relational storage)
- **SQLAlchemy** (ORM + query layer)
- **JWT Authentication** (token-based auth)
- **CSV Ingestion Pipelines** (games/odds/results)
- **Next.js / React** (lightweight frontend for consuming the API)
- **Vercel** (frontend deployment)
- **Git/GitHub** (branching, commit history hygiene)

---

## Assumptions & Limitations

- Free, reliable APIs for both **betting odds** and **real-time/final scores** are inconsistent or rate-limited, so this version supports **manual CSV uploads** for:
  - weekly odds
  - final scores/results
- The deployed frontend is intentionally simple; the project’s core value is the **backend system design**
- This version grades user picks after results ingestion rather than live-updating during games

---
## Project Structure
```
.
├── app/ # Flask application package
│ ├── api/ # API route modules
│ │ ├── auth.py # Auth endpoints
│ │ ├── predictions.py # Prediction endpoints
│ │ ├── users.py # User + stats endpoints
│ │ └── weeks.py # Week/game listing endpoints
│ ├── config.py # App configuration
│ ├── db_init.py # DB initialization helpers
│ ├── extensions.py # Flask extensions
│ ├── models.py # SQLAlchemy models
│ ├── routes.py # Blueprint wiring
│ └── init.py # App factory
│
├── data/ # Weekly CSV inputs
│ ├── nfl/2025/week1_nfl.csv
│ └── ncaaf/2025/week1_ncaaf.csv
│
├── scripts/ # Ingest + grading utilities
│ ├── load_games_from_csv.py
│ ├── load_odds_from_csv.py
│ ├── grade_predictions.py
│ └── create_test_predictions.py
│
├── frontend/ # Next.js frontend
│ ├── app/
│ │ ├── _components/HeaderNav.tsx
│ │ ├── login/page.tsx
│ │ ├── register/page.tsx
│ │ ├── stats/page.tsx
│ │ ├── layout.tsx
│ │ └── page.tsx # Main picks UI
│ ├── lib/
│ │ ├── api.ts # API wrapper
│ │ └── auth.ts # Auth helpers
│ └── package.json
│
├── ingest_week.py # Weekly ingest convenience script
├── run.py # Backend entrypoint
├── requirements.txt
├── .env.example
└── README.md
```
---

## How to Run Locally

1. Clone the repository
```bash
git clone https://github.com/hjlinto/your-football-prediction-repo.git
```
2. Set up the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
3. Configure environment variables
```bash
SECRET_KEY=your_secret_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/footballpredictions
```
4. Run database setup and start the API
```bash
flask run
```
5. Start the frontend
```bash
cd ../frontend
npm install
npm run dev
```
6. Open:
- Frontend: http://localhost:3000/
- API: http://127.0.0.1:5000/
---
## Reflections

- With a reliable odds and scores provider, manual CSV uploads could be replaced with automated ingestion pipelines.
- I would integrate a predictive model to generate baseline picks, allowing direct comparison between user performance and algorithmic strategies.
- I would expand the analytics layer to include week-by-week trends, category-specific accuracy, and ROI-style performance metrics for spread and total picks.
---
## Author

Created by **Hunter J. Linton**
