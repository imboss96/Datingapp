#!/bin/bash

# Simple webhook receiver for GitHub pushes
PORT=9000
LOG_FILE="/var/log/datingapp-webhook.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

handle_deploy() {
    log_message "Deployment triggered!"
    
    cd /var/www/datingapp
    
    # Pull latest code
    if ! git pull origin main >> "$LOG_FILE" 2>&1; then
        log_message "ERROR: git pull failed"
        return 1
    fi
    
    # Build
    if ! npm run build >> "$LOG_FILE" 2>&1; then
        log_message "ERROR: npm build failed"
        return 1
    fi
    
    # Restart app
    if ! pm2 restart datingapp >> "$LOG_FILE" 2>&1; then
        log_message "ERROR: pm2 restart failed"
        return 1
    fi
    
    log_message "Deployment successful!"
    return 0
}

# Simple HTTP server using socat (netcat replacement)
log_message "Starting webhook server on port $PORT"

while true; do
    {
        echo -ne "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n"
        handle_deploy
    } | nc -l -p $PORT -q 1
done
