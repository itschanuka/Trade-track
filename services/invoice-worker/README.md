# TradeTrack Invoice Worker

Small FastAPI worker used as a portfolio proof point for Python and Cloud Run.

## Local Development

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8080
pytest
```

## Endpoint

- `GET /health`
- `POST /summaries/overdue`

The summary endpoint accepts org-scoped invoice or quote data and returns totals, balance, and overdue status. It does not connect to Supabase directly, so service-role database access stays out of this worker unless explicitly added later.
