#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy/setup-cron.sh  — Thiết lập cron jobs cho KickSight trên EC2
#
# Chạy 1 lần sau khi deploy:
#   bash /home/ubuntu/kicksight/deploy/setup-cron.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_DIR="/home/ubuntu/kicksight"
VENV="$APP_DIR/.venv/bin/python"
SCRIPT="$APP_DIR/scripts/auto_pipeline.py"
LOG="$APP_DIR/logs/pipeline.log"

# Kiểm tra Python venv
if [ ! -f "$VENV" ]; then
  echo "ERROR: Không tìm thấy venv tại $VENV"
  echo "Hãy chạy: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/models"

echo "Cài đặt cron jobs cho KickSight..."

# Xoá các cron job cũ của kicksight (tránh duplicate)
crontab -l 2>/dev/null | grep -v "auto_pipeline" | crontab - 2>/dev/null || true

# Tạo file cron tạm
CRON_TMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TMP" || true

cat >> "$CRON_TMP" << EOF

# ── KickSight Auto Pipeline ───────────────────────────────────────────────────

# [1] Odds update: mỗi 30 phút (liên tục cả ngày)
*/30 * * * * cd $APP_DIR && $VENV $SCRIPT --odds >> $LOG 2>&1

# [2] Matches + Predictions: mỗi 6 tiếng (02:00, 08:00, 14:00, 20:00)
0 2,8,14,20 * * * cd $APP_DIR && $VENV $SCRIPT --matches >> $LOG 2>&1

# [3] Model retrain: mỗi thứ Hai lúc 03:00 sáng
0 3 * * 1   cd $APP_DIR && $VENV $SCRIPT --train >> $LOG 2>&1

# [4] Full reset: Chủ nhật 01:00 sáng (sync đầy đủ dữ liệu lịch sử)
0 1 * * 0   cd $APP_DIR && $VENV $SCRIPT --full >> $LOG 2>&1

EOF

crontab "$CRON_TMP"
rm "$CRON_TMP"

echo ""
echo "Cron jobs đã được cài đặt:"
crontab -l | grep -A1 "KickSight"

echo ""
echo "Cron schedule:"
echo "  Odds:        mỗi 30 phút"
echo "  Matches:     02:00, 08:00, 14:00, 20:00"
echo "  Retrain:     Thứ Hai 03:00 sáng"
echo "  Full sync:   Chủ nhật 01:00 sáng"
echo ""
echo "Log: $LOG"
echo ""
echo "Xem log realtime:"
echo "  tail -f $LOG"
