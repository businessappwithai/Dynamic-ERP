# Hospital Management System - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Docker Testing](#local-docker-testing)
3. [Hostinger Deployment](#hostinger-deployment)
4. [Configuration](#configuration)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Docker 20.10+
- Docker Compose 1.29+
- Git
- SSH access to Hostinger server (VPS/Dedicated)

### Hostinger Account
- VPS or Dedicated Server with:
  - 2+ CPU cores
  - 2GB+ RAM
  - 20GB+ disk space
  - Ubuntu 20.04+ or CentOS 8+
  - Docker & Docker Compose pre-installed

### Credentials Needed
- Hostinger SSH credentials (username, password/key, host)
- Database credentials (or we'll generate)
- Domain name pointing to Hostinger IP

---

## Local Docker Testing

### 1. Build Docker Images

```bash
cd hospital-swiss-clean-new

# Build all services
docker-compose -f docker-compose.prod.yml build

# Or build individual services
docker build -t hospital-backend:latest --target backend-prod .
docker build -t hospital-frontend:latest --target frontend-prod .
```

### 2. Create Production Environment File

```bash
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Key variables to set:**
```env
DB_PASSWORD=your_secure_password_here
JWT_SECRET=generate-random-secret
AUTH_SECRET=generate-random-secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
CORS_ORIGIN=https://your-domain.com
```

### 3. Start Services Locally

```bash
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 4. Verify Services

```bash
# Test backend
curl http://localhost:3001/api/bus/patient?limit=1

# Test frontend
curl http://localhost:3000

# Test database
docker-compose -f docker-compose.prod.yml exec postgres psql -U hospital_admin -d hospital-swiss-clean -c "SELECT version();"
```

### 5. Stop Services

```bash
docker-compose -f docker-compose.prod.yml down

# Remove all data
docker-compose -f docker-compose.prod.yml down -v
```

---

## Hostinger Deployment

### Option 1: Manual SSH Deployment

#### Step 1: Connect to Hostinger Server

```bash
ssh user@your.hostinger.ip
```

#### Step 2: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Step 3: Clone Repository

```bash
cd /home/user
git clone <your-repo-url> hospital-app
cd hospital-app/generated-projects/hospital-swiss-clean-new
```

#### Step 4: Configure Environment

```bash
cp .env.production.example .env.production

# Edit with secure values
nano .env.production
```

#### Step 5: Deploy with Script

```bash
chmod +x scripts/deploy-hostinger.sh
./scripts/deploy-hostinger.sh production
```

#### Step 6: Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/hospital
```

**Example Nginx config:**

```nginx
upstream backend {
    server localhost:3001;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
    }
}
```

#### Step 7: Enable SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

#### Step 8: Enable and Start Nginx

```bash
sudo ln -s /etc/nginx/sites-available/hospital /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Docker Registry Deployment

#### Step 1: Create Docker Hub Account

Sign up at https://hub.docker.com

#### Step 2: Build and Push Images

```bash
# Login to Docker Hub
docker login

# Build images
docker-compose -f docker-compose.prod.yml build

# Tag images
docker tag hospital-backend:latest your-docker-username/hospital-backend:latest
docker tag hospital-frontend:latest your-docker-username/hospital-frontend:latest

# Push to Docker Hub
docker push your-docker-username/hospital-backend:latest
docker push your-docker-username/hospital-frontend:latest
```

#### Step 3: Deploy on Hostinger

```bash
# On Hostinger server
docker pull your-docker-username/hospital-backend:latest
docker pull your-docker-username/hospital-frontend:latest

# Update docker-compose.prod.yml to use your images
# Then:
docker-compose -f docker-compose.prod.yml up -d
```

---

## Configuration

### Environment Variables

See `.env.production.example` for all available variables. Key variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `DB_PASSWORD` | Database password | `SecurePassword123!` |
| `JWT_SECRET` | JWT signing secret | Random 32+ char string |
| `AUTH_SECRET` | Auth secret | Random 32+ char string |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `https://hospital.example.com` |
| `NEXT_PUBLIC_API_URL` | API URL | `https://hospital.example.com/api` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://hospital.example.com` |

### Database Backups

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U hospital_admin hospital-swiss-clean > backup.sql

# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U hospital_admin hospital-swiss-clean < backup.sql
```

### Log Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Save logs to file
docker-compose -f docker-compose.prod.yml logs > logs.txt

# Clear logs
docker-compose -f docker-compose.prod.yml logs --remove orphans
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U hospital_admin -d hospital-swiss-clean -c "SELECT 1;"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Reset database
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d postgres
```

### Port Conflicts

```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432

# Kill process
kill -9 <PID>

# Or change ports in .env file
```

### Memory Issues

```bash
# Check resource usage
docker stats

# Limit container memory (in docker-compose.prod.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check backend health
curl https://your-domain.com/health

# Check frontend
curl https://your-domain.com

# Check all services
docker-compose -f docker-compose.prod.yml ps
```

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker pull postgres:16-alpine
docker pull node:20-alpine

# Check for vulnerabilities
docker scan hospital-backend:latest
docker scan hospital-frontend:latest
```

---

## Support

For deployment issues:
1. Check `/var/log/docker-compose.log`
2. Review container logs: `docker-compose logs [service]`
3. Verify environment variables: `docker-compose config`
4. Test connectivity: `curl http://localhost:3000` and `curl http://localhost:3001`

---

Last Updated: 2026-04-24
