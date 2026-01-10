# RelayPACS Backend

Mobile-first DICOM ingestion node built with FastAPI.

## Requirements

- Python 3.11+
- Docker and Docker Compose

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run development server:
```bash
uvicorn app.main:app --reload
```

## Docker Development

```bash
docker-compose up
```

## Testing

```bash
pytest tests/ -v --cov=app
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
