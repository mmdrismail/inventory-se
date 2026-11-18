# StockLine Deployment & Operations Guide

This guide covers production deployment configurations for StockLine Inventory SE across static hosting (GitHub Pages), Docker containers, and Node.js process managers.

---

## 1. Frontend Static Deployment (GitHub Pages)

### Build Command
The Vite frontend compiles directly to the `dist/` directory:
```bash
npm run build
```

### GitHub Pages Settings
- **Base Path**: Configured as `/inventory-se/` in `vite.config.js`.
- **Target Branch**: `gh-pages`
- **Deploying via Git**:
  ```bash
  # Push built dist assets to gh-pages branch
  git subtree push --prefix dist origin gh-pages
  ```
- **Live URL**: `https://saifulahnmsajed.github.io/inventory-se/` (and `https://mmdrismail.github.io/inventory-se/`)

---

## 2. Docker Containerization

### Dockerfile Breakdown
The project includes a multi-stage Docker build:
```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production
COPY server ./server
COPY --from=builder /app/dist ./public
EXPOSE 5000
CMD ["node", "server/server.js"]
```

### Building & Running Container
```bash
docker build -t stockline-wms:latest .
docker run -d -p 5000:5000 --env-file server/.env --name stockline stockline-wms:latest
```

---

## 3. Node.js Production Management (PM2)

For traditional VPS deployment (Ubuntu/Debian):
```bash
# Install PM2 globally
npm install -g pm2

# Start server under cluster mode
pm2 start server/server.js --name "stockline-api" -i max

# Save process list for system reboot
pm2 save
pm2 startup
```

---

## 4. Nginx Reverse Proxy & SSL Configuration

```nginx
server {
    listen 80;
    server_name wms.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wms.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/wms.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wms.yourdomain.com/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/stockline/dist;
        try_files $uri $uri/ /index.html;
    }
}
```
