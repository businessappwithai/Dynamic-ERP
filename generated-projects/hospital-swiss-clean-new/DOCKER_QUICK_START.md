# Hospital Management System - Docker Quick Start Guide

## 📦 What's Included

This complete Docker setup includes:
- ✅ **Backend API**: NestJS + Fastify on port 3001
- ✅ **Frontend**: Next.js on port 3000  
- ✅ **Database**: PostgreSQL 16 on port 5432
- ✅ **Docker Compose**: Full stack orchestration
- ✅ **Deployment Scripts**: Automated deployment to Hostinger
- ✅ **Health Checks**: Service monitoring and verification
- ✅ **Database Backups**: Automated backup management

---

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
```bash
# Install Docker and Docker Compose
# macOS: brew install docker docker-compose
# Ubuntu: sudo apt install docker.io docker-compose
# Windows: Download Docker Desktop

# Verify installation
docker --version
docker-compose --version
```

### 2. Start All Services
```bash
# Navigate to project
cd hospital-swiss-clean-new

# Start services
./scripts/docker-start.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Test Services
```bash
# Frontend
curl http://localhost:3000

# Backend API
curl http://localhost:3001/api/bus/patient?limit=1

# Database
docker-compose -f docker-compose.prod.yml exec postgres psql -U hospital_admin -d hospital-swiss-clean
```

### 4. Check Health
```bash
./scripts/health-check.sh
```

### 5. Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

---

## 📋 Available Scripts

### Build Docker Images
```bash
./scripts/build-docker.sh              # Build locally
./scripts/build-docker.sh --push       # Build and push to Docker Hub
./scripts/build-docker.sh --tag v1.0   # Build with specific tag
```

### Start Services
```bash
./scripts/docker-start.sh              # Start all services locally
./scripts/docker-start.sh production   # Start with production config
```

### Monitor Services
```bash
./scripts/health-check.sh              # Check all service health
docker-compose -f docker-compose.prod.yml logs -f  # View live logs
docker-compose -f docker-compose.prod.yml ps       # View status
docker stats                           # View resource usage
```

### Manage Database
```bash
./scripts/backup-database.sh           # Create backup
./scripts/backup-database.sh ./backups # Save to specific directory

# Restore backup
gunzip < backups/hospital-backup_*.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U hospital_admin -d hospital-swiss-clean
```

### Deploy to Hostinger
```bash
./scripts/deploy-hostinger.sh          # Deploy with production config
./scripts/deploy-hostinger.sh development  # Deploy development version
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Copy example to production config
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Key Variables:**
- `DB_PASSWORD` - Database password (REQUIRED)
- `JWT_SECRET` - JWT signing key (REQUIRED)
- `AUTH_SECRET` - Authentication secret (REQUIRED)
- `NEXT_PUBLIC_APP_URL` - Frontend URL (e.g., https://hospital.example.com)
- `NEXT_PUBLIC_API_URL` - API URL (e.g., https://hospital.example.com/api)

### Database Credentials
```bash
# Default credentials in docker-compose.prod.yml:
DB_USER=hospital_admin
DB_PASSWORD=hospital_secure_password  # CHANGE THIS!
DB_NAME=hospital-swiss-clean
```

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx/Proxy                    │
│            (Port 80 → 443 with SSL)             │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐          ┌────────▼────────┐
│  Frontend      │          │  Backend API    │
│  Next.js       │          │  NestJS         │
│  Port: 3000    │          │  Port: 3001     │
└───────┬────────┘          └────────┬────────┘
        │                            │
        └──────────────┬─────────────┘
                       │
                ┌──────▼──────┐
                │  PostgreSQL  │
                │  Port: 5432  │
                └──────────────┘
```

---

## 🐳 Docker Commands Reference

### Container Management
```bash
# List running containers
docker ps

# View container logs
docker logs <container-id>
docker-compose -f docker-compose.prod.yml logs -f backend

# Stop containers
docker stop <container-id>
docker-compose -f docker-compose.prod.yml stop

# Restart containers
docker restart <container-id>
docker-compose -f docker-compose.prod.yml restart backend

# Remove containers
docker rm <container-id>
docker-compose -f docker-compose.prod.yml down -v  # Remove all + volumes
```

### Image Management
```bash
# List images
docker images

# Remove image
docker rmi hospital-backend:latest

# Tag image
docker tag hospital-backend:latest myregistry/hospital-backend:v1.0

# Push to registry
docker push myregistry/hospital-backend:v1.0
```

### Database Access
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U hospital_admin -d hospital-swiss-clean

# Run SQL command
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U hospital_admin -d hospital-swiss-clean -c "SELECT COUNT(*) FROM bus_patient;"
```

---

## 🔒 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT_SECRET (min 32 chars)
- [ ] Generated strong AUTH_SECRET (min 32 chars)
- [ ] Set correct CORS_ORIGIN for production
- [ ] Configured SSL certificates
- [ ] Enabled firewall rules
- [ ] Set up database backups
- [ ] Reviewed environment variables
- [ ] Tested health checks
- [ ] Set up monitoring

---

## 📈 Monitoring & Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs

# Specific service
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs (live)
docker-compose -f docker-compose.prod.yml logs -f frontend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 postgres
```

### Resource Usage
```bash
# Real-time stats
docker stats

# One-time snapshot
docker stats --no-stream

# Specific container
docker stats hospital-backend
```

### Service Health
```bash
./scripts/health-check.sh

# Or check individual services
curl http://localhost:3001/api/bus/patient?limit=1
curl http://localhost:3000
docker-compose -f docker-compose.prod.yml ps
```

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :3000    # Frontend
sudo lsof -i :3001    # Backend
sudo lsof -i :5432    # Database

# Kill process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test database
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U hospital_admin -d hospital-swiss-clean -c "SELECT 1;"

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

### Services Not Starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Verify Docker daemon
docker ps

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean up unused images/containers
docker system prune

# Remove all unused resources (warning: aggressive)
docker system prune -a --volumes
```

---

## 📚 Additional Resources

- [Complete Deployment Guide](./DEPLOYMENT.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 🆘 Getting Help

### Check Logs First
```bash
docker-compose -f docker-compose.prod.yml logs [service]
```

### Test Services
```bash
./scripts/health-check.sh
```

### Verify Network
```bash
docker network ls
docker network inspect hospital-network
```

---

## 📝 Notes

- **Data Persistence**: Database data is stored in `postgres_data` Docker volume
- **Backups**: Use `backup-database.sh` regularly
- **SSL**: Use Nginx reverse proxy with Let's Encrypt for production
- **Environment**: Always use `.env.production` for sensitive credentials
- **Security**: Never commit `.env` files to Git

---

**Last Updated:** 2026-04-24  
**Version:** 1.0.0
