# Hospital Management System - Hostinger Deployment Guide

**Status**: ✅ Ready for Production Deployment  
**Last Updated**: 2026-04-24  
**Docker Setup**: Complete with automation scripts

---

## 📋 Pre-Deployment Checklist

Before deploying to Hostinger, ensure you have:

- [ ] Hostinger VPS/Dedicated server with Docker and Docker Compose installed
- [ ] SSH access to Hostinger server
- [ ] Domain name pointing to your Hostinger server IP
- [ ] Database password set (will be in .env.production)
- [ ] JWT_SECRET and AUTH_SECRET generated (32+ characters each)
- [ ] SSL certificate ready (Let's Encrypt recommended)

---

## 🚀 Quick Deployment (Option A - Recommended)

### Step 1: Prepare Hostinger Server

SSH into your Hostinger server:

```bash
ssh root@your.hostinger.ip
# or
ssh user@your.hostinger.ip
```

### Step 2: Clone Repository

```bash
cd /home
git clone https://github.com/YOUR_USERNAME/your-repo-name hospital-app
cd hospital-app/generated-projects/hospital-swiss-clean-new
```

### Step 3: Create Production Environment

```bash
cp .env.production.example .env.production
nano .env.production
```

**Essential values to set:**

```env
# Database (strong password required!)
DATABASE_PASSWORD=MySecurePassword123!@#

# Generate these with: openssl rand -base64 32
JWT_SECRET=your_generated_jwt_secret_here
AUTH_SECRET=your_generated_auth_secret_here
SESSION_SECRET=your_generated_session_secret_here

# Your domain
NEXT_PUBLIC_APP_URL=https://hospital.yourdomain.com
NEXT_PUBLIC_API_URL=https://hospital.yourdomain.com/api
BETTER_AUTH_URL=https://hospital.yourdomain.com
CORS_ORIGIN=https://hospital.yourdomain.com
```

### Step 4: Deploy with Automated Script

```bash
./scripts/deploy-hostinger.sh production
```

This script will:
- ✅ Build Docker images
- ✅ Pull base images
- ✅ Stop existing containers
- ✅ Start services
- ✅ Run database migrations
- ✅ Verify health

**Output:**
```
✓ Backend API: http://localhost:3001
✓ Frontend: http://localhost:3000
✓ Database: localhost:5432
```

### Step 5: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/hospital`:

```nginx
upstream hospital_frontend {
    server 127.0.0.1:3000;
}

upstream hospital_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    listen [::]:80;
    server_name hospital.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hospital.yourdomain.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/hospital.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hospital.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    location / {
        proxy_pass http://hospital_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://hospital_backend/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hospital /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Set Up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Request certificate
sudo certbot certonly --standalone \
  -d hospital.yourdomain.com \
  -d www.hospital.yourdomain.com

# Auto-renewal (runs daily)
sudo systemctl enable certbot.timer
```

---

## 🐳 Manual Deployment (Option B)

If you prefer to run commands manually instead of using the script:

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate

# Check health
./scripts/health-check.sh
```

---

## 🔀 Docker Registry Deployment (Option C)

For faster deployments without rebuilding on the server:

### Step 1: Build and Push to Registry

On your local machine:

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Tag for Docker Hub
docker tag hospital-backend:latest yourusername/hospital-backend:latest
docker tag hospital-frontend:latest yourusername/hospital-frontend:latest

# Push to Docker Hub
docker login
docker push yourusername/hospital-backend:latest
docker push yourusername/hospital-frontend:latest
```

### Step 2: Pull on Hostinger

```bash
# Update docker-compose.prod.yml to use your registry images:
# image: yourusername/hospital-backend:latest
# image: yourusername/hospital-frontend:latest

docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Post-Deployment Verification

### Check Services Running

```bash
docker ps
docker-compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Test Endpoints

```bash
# Backend health
curl https://hospital.yourdomain.com/api/bus/patient?limit=1

# Frontend
curl https://hospital.yourdomain.com

# Database
docker-compose -f docker-compose.prod.yml exec postgres psql \
  -U hospital_admin -d hospital-swiss-clean \
  -c "SELECT COUNT(*) FROM bus_patient;"
```

### Run Health Check

```bash
./scripts/health-check.sh
```

---

## 🔄 Maintenance Tasks

### Database Backup

```bash
# Create backup
./scripts/backup-database.sh

# Restore from backup
gunzip < .backups/hospital-backup_*.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U hospital_admin -d hospital-swiss-clean
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Run migrations (if any)
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate
```

### Monitor Services

```bash
# Real-time monitoring
docker stats

# Check resource usage
docker system df

# Clean up old images/volumes
docker system prune
```

---

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432

# Kill process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql \
  -U hospital_admin -d hospital-swiss-clean -c "SELECT 1;"
```

### Services Not Starting

```bash
# Check all logs
docker-compose -f docker-compose.prod.yml logs

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Start fresh
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run

# Check Nginx SSL
sudo nginx -t
sudo systemctl restart nginx
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Limit container memory (in docker-compose.prod.yml):
services:
  backend:
    mem_limit: 512m
  frontend:
    mem_limit: 512m
  postgres:
    mem_limit: 1g
```

---

## 📞 Support Resources

### Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql \
  -U hospital_admin -d hospital-swiss-clean

# Execute SQL commands
docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U hospital_admin -d hospital-swiss-clean \
  -c "SELECT * FROM bus_patient LIMIT 5;"

# Restart services
docker-compose -f docker-compose.prod.yml restart [service]

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: deletes database)
docker-compose -f docker-compose.prod.yml down -v
```

### External Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Hostinger Help Center](https://support.hostinger.com/)

---

## 🔒 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong secrets (JWT_SECRET, AUTH_SECRET, SESSION_SECRET)
- [ ] Configured SSL/TLS with Let's Encrypt
- [ ] Set CORS_ORIGIN to your domain only
- [ ] Disabled public SSH root access
- [ ] Set firewall rules (only ports 80, 443)
- [ ] Enabled database backups
- [ ] Configured log rotation
- [ ] Set up monitoring/alerts
- [ ] Reviewed sensitive environment variables
- [ ] Disabled unnecessary services

---

## ✅ Deployment Summary

| Component | Status | Location |
|-----------|--------|----------|
| Backend (NestJS) | ✅ Ready | Port 3001 |
| Frontend (Next.js) | ✅ Ready | Port 3000 |
| Database (PostgreSQL) | ✅ Ready | Port 5432 |
| Docker Images | ✅ Ready | Multi-stage builds |
| Deployment Scripts | ✅ Ready | ./scripts/ |
| Documentation | ✅ Ready | Root directory |
| SSL/TLS | ✅ Ready | Let's Encrypt |
| Backups | ✅ Ready | Automated |
| Health Monitoring | ✅ Ready | health-check.sh |

---

**Status**: 🟢 **Production Ready**  
**Deployment Date**: 2026-04-24  
**Next Step**: Follow "Quick Deployment (Option A)" above
