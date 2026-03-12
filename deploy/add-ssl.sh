#!/bin/bash
# Thêm SSL (HTTPS) cho domain
# Dùng: ./deploy/add-ssl.sh yourdomain.com

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Cách dùng: ./deploy/add-ssl.sh yourdomain.com"
  exit 1
fi

echo "Cấu hình SSL cho ${DOMAIN}..."

# Cập nhật Nginx config với domain thật
sudo sed -i "s/server_name _;/server_name ${DOMAIN};/" /etc/nginx/sites-available/kicksight
sudo nginx -t && sudo systemctl reload nginx

# Cập nhật CORS trong .env
sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN},http://${DOMAIN}|" /home/ubuntu/kicksight/.env
sudo systemctl restart kicksight

# Lấy SSL certificate
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN} --redirect

echo ""
echo "SSL đã cài xong!"
echo "Truy cập: https://${DOMAIN}"
