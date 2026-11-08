# API Monitoring Dashboard

This project contains a Flask backend and a React frontend for monitoring API health and usage.

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Backend setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The backend runs on http://localhost:5000.

## Frontend setup

```bash
cd frontend
npm install
npm start
```

The frontend runs on http://localhost:3000.

## Notes

- The backend exposes the API status and usage endpoints consumed by the dashboard.
- If your app environment uses different local service URLs, update the endpoints configured in the backend before testing.
