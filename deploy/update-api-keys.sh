#!/bin/bash
# Cập nhật API keys và chạy data pipeline
# Dùng: ./deploy/update-api-keys.sh

APP_DIR="/home/ubuntu/kicksight"
ENV_FILE="${APP_DIR}/.env"

echo "=== Cập nhật API Keys ==="
echo ""

read -p "FOOTBALL_DATA_API_KEY (Enter để bỏ qua): " FD_KEY
read -p "ODDS_API_KEY (Enter để bỏ qua): " ODDS_KEY
read -p "OPENAI_API_KEY (Enter để bỏ qua): " OAI_KEY

if [ -n "$FD_KEY" ]; then
  sed -i "s|^FOOTBALL_DATA_API_KEY=.*|FOOTBALL_DATA_API_KEY=${FD_KEY}|" "$ENV_FILE"
  echo "  football-data.org key đã cập nhật"
fi

if [ -n "$ODDS_KEY" ]; then
  sed -i "s|^ODDS_API_KEY=.*|ODDS_API_KEY=${ODDS_KEY}|" "$ENV_FILE"
  echo "  the-odds-api.com key đã cập nhật"
fi

if [ -n "$OAI_KEY" ]; then
  sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=${OAI_KEY}|" "$ENV_FILE"
  echo "  OpenAI key đã cập nhật"
fi

sudo systemctl restart kicksight
echo ""
echo "Server đã restart với keys mới."
echo ""

read -p "Chạy data pipeline ngay? (y/n): " RUN_PIPELINE
if [ "$RUN_PIPELINE" = "y" ]; then
  cd "$APP_DIR"
  source .venv/bin/activate
  python scripts/ingest_real_data.py
  deactivate
  echo "Pipeline hoàn tất!"
fi
