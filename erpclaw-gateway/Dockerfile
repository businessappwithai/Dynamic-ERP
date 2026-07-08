FROM python:3.11-slim

# pg_dump/pg_restore (used by erpclaw's backup/restore actions, not the gateway
# itself) plus build deps for psycopg2-binary's transitive needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    "fastapi>=0.115" "uvicorn[standard]>=0.32" "pydantic>=2.9" \
    "python-jose[cryptography]>=3.3" "psycopg2-binary>=2.9"

COPY erpclaw-gateway/app /app/erpclaw-gateway/app
COPY erpclaw/requirements.txt /app/erpclaw/requirements.txt
RUN pip install --no-cache-dir -r /app/erpclaw/requirements.txt

WORKDIR /app/erpclaw-gateway
ENV PYTHONPATH=/app/erpclaw-gateway

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
