#!/bin/bash
# SSL Certificate Setup Script for Miaoda IDE
# Supports both Let's Encrypt and self-signed certificates

set -e

SSL_DIR="./ssl"
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@example.com}"

echo "=== Miaoda IDE SSL Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Create SSL directory
mkdir -p "$SSL_DIR"

# Function to generate self-signed certificate
generate_self_signed() {
    echo "Generating self-signed certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Miaoda/CN=$DOMAIN"
    echo "Self-signed certificate generated successfully!"
}

# Function to setup Let's Encrypt
setup_letsencrypt() {
    echo "Setting up Let's Encrypt certificate..."

    if ! command -v certbot &> /dev/null; then
        echo "Error: certbot is not installed."
        echo "Install it with: sudo apt-get install certbot python3-certbot-nginx"
        exit 1
    fi

    # Request certificate
    sudo certbot certonly --standalone \
        -d "$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive

    # Copy certificates to SSL directory
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
    sudo chown $(whoami):$(whoami) "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem"

    echo "Let's Encrypt certificate installed successfully!"
    echo "Certificate will auto-renew via certbot."
}

# Main menu
echo "Choose SSL certificate type:"
echo "1) Self-signed certificate (for development)"
echo "2) Let's Encrypt certificate (for production)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        generate_self_signed
        ;;
    2)
        setup_letsencrypt
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "SSL setup complete!"
echo "Certificates are located in: $SSL_DIR"
echo "You can now start the production environment with:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
