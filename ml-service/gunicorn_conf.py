# TrustShield AI - Gunicorn Production Configuration
# Bank of Baroda Hackathon 2026

import multiprocessing

# Network socket binding
bind = "0.0.0.0:8080"

# Process scaling: 2 * cores + 1
workers = multiprocessing.cpu_count() * 2 + 1

# Asynchronous worker class for FastAPI/ASGI
worker_class = "uvicorn.workers.UvicornWorker"

# Timeout configurations to prevent hanging workers
timeout = 120
keepalive = 5

# Logging configurations
loglevel = "info"
accesslog = "-"
errorlog = "-"
