#!/bin/bash
set -e

echo "=========================================="
echo "  KickSight EC2 Deploy Script"
echo "=========================================="

export DEBIAN_FRONTEND=noninteractive

# --- 1. System packages ---
echo "[1/8] Cài đặt system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  postgresql postgresql-contrib \
  nginx certbot python3-certbot-nginx \
  python3 python3-pip python3-venv \
  curl git build-essential libpq-dev

# Node.js 20
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

echo "  Node $(node -v) | Python $(python3 --version | cut -d' ' -f2) | PostgreSQL $(psql --version | cut -d' ' -f3)"

# --- 2. PostgreSQL setup ---
echo "[2/8] Cấu hình PostgreSQL..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

DB_PASS=$(openssl rand -hex 16)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='kicksight'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER kicksight WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='kicksight'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE kicksight OWNER kicksight;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kicksight TO kicksight;"

sudo -u postgres psql -d kicksight < /home/ubuntu/kicksight/scripts/init-db.sql
sudo -u postgres psql -d kicksight -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO kicksight;"
sudo -u postgres psql -d kicksight -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO kicksight;"

DATABASE_URL="postgresql://kicksight:${DB_PASS}@localhost:5432/kicksight"
echo "  Database: kicksight (user: kicksight)"

# --- 3. App directory ---
echo "[3/8] Cấu hình ứng dụng..."
APP_DIR="/home/ubuntu/kicksight"

JWT_SECRET=$(openssl rand -hex 32)

cat > "${APP_DIR}/.env" <<ENVFILE
# === Server ===
PORT=3001
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=${DATABASE_URL}
CORS_ORIGINS=DOMAIN_PLACEHOLDER

# === Python Backend ===
DATABASE_URL_ASYNC=postgresql+asyncpg://kicksight:${DB_PASS}@localhost:5432/kicksight
DATABASE_URL_SYNC=postgresql+psycopg2://kicksight:${DB_PASS}@localhost:5432/kicksight

# === API Keys (điền sau) ===
FOOTBALL_DATA_API_KEY=${FOOTBALL_DATA_API_KEY:-}
ODDS_API_KEY=${ODDS_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# === Betting Config ===
KELLY_FRACTION=0.25
MIN_EV_THRESHOLD=0.03
MAX_BET_FRACTION=0.05
BANKROLL=1000.0
LOG_LEVEL=INFO
ENVIRONMENT=production
ENVFILE

# --- 4. Node.js dependencies ---
echo "[4/8] Cài đặt Node.js dependencies..."
cd "${APP_DIR}/server"
npm install 2>/dev/null

# --- 5. Python dependencies ---
echo "[5/8] Cài đặt Python dependencies..."
cd "${APP_DIR}"
python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt 2>/dev/null
deactivate

# --- 6. Nginx reverse proxy ---
echo "[6/8] Cấu hình Nginx..."
sudo tee /etc/nginx/sites-available/kicksight > /dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/kicksight /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# --- 7. Systemd services ---
echo "[7/8] Tạo systemd services..."

sudo tee /etc/systemd/system/kicksight.service > /dev/null <<SERVICE
[Unit]
Description=KickSight Node.js Server
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${APP_DIR}/server
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node --import tsx index.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable kicksight
sudo systemctl start kicksight

# --- 8. Done ---
echo "[8/8] Hoàn tất!"
echo ""
echo "=========================================="
echo "  KickSight đã deploy thành công!"
echo "=========================================="
echo ""
echo "  URL:       http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "  Database:  postgresql://kicksight:***@localhost:5432/kicksight"
echo "  Logs:      sudo journalctl -u kicksight -f"
echo ""
echo "  Bước tiếp theo:"
echo "  1. Trỏ domain về IP này"
echo "  2. Chạy: sudo certbot --nginx -d yourdomain.com"
echo "  3. Điền API keys vào .env rồi: sudo systemctl restart kicksight"
echo "  4. Chạy data pipeline: cd /home/ubuntu/kicksight && source .venv/bin/activate && python scripts/ingest_real_data.py"
echo ""
