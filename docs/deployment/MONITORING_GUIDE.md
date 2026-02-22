# Miaoda IDE - Monitoring Guide

Comprehensive monitoring setup for Miaoda IDE production environments.

## Table of Contents

1. [Overview](#overview)
2. [Prometheus Setup](#prometheus-setup)
3. [Grafana Dashboards](#grafana-dashboards)
4. [Alerting](#alerting)
5. [Log Aggregation](#log-aggregation)
6. [Health Checks](#health-checks)
7. [Metrics](#metrics)
8. [Best Practices](#best-practices)

## Overview

Miaoda IDE monitoring stack includes:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Alertmanager** - Alert routing and management
- **Node Exporter** - System metrics
- **cAdvisor** - Container metrics

## Prometheus Setup

### Installation

#### Docker (Recommended)

```bash
# Already included in docker-compose.prod.yml
cd infrastructure
docker-compose -f docker-compose.prod.yml up -d prometheus
```

#### Manual Installation

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/latest/download/prometheus-*.linux-amd64.tar.gz
tar xvfz prometheus-*.linux-amd64.tar.gz
cd prometheus-*

# Copy configuration
cp monitoring/prometheus.yml ./prometheus.yml

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

### Configuration

Edit `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'miaoda-server'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Access Prometheus

- URL: http://localhost:9090
- Query interface: http://localhost:9090/graph
- Targets: http://localhost:9090/targets

## Grafana Dashboards

### Installation

```bash
# Docker (included in docker-compose.prod.yml)
docker-compose -f docker-compose.prod.yml up -d grafana

# Access Grafana
# URL: http://localhost:3001
# Default credentials: admin/admin
```

### Configure Data Source

1. Login to Grafana
2. Go to Configuration > Data Sources
3. Add Prometheus data source:
   - URL: http://prometheus:9090
   - Access: Server (default)

### Import Dashboards

#### System Overview Dashboard

```json
{
  "dashboard": {
    "title": "Miaoda IDE - System Overview",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "targets": [
          {
            "expr": "(1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100"
          }
        ]
      }
    ]
  }
}
```

#### Application Metrics Dashboard

```json
{
  "dashboard": {
    "title": "Miaoda IDE - Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

## Alerting

### Alert Rules

Edit `monitoring/alerts.yml`:

```yaml
groups:
  - name: miaoda_alerts
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"

      - alert: HighCPU
        expr: cpu_usage > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage: {{ $value }}%"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'alerts@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'

  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'Miaoda IDE Alert'
```

### Test Alerts

```bash
# Trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }
]'
```

## Log Aggregation

### Centralized Logging with Loki

```yaml
# docker-compose.prod.yml addition
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

### View Logs in Grafana

1. Add Loki data source
2. Explore logs: http://localhost:3001/explore
3. Query: `{job="miaoda-server"}`

## Health Checks

### Automated Health Checks

```bash
# Add to crontab
*/5 * * * * /opt/miaoda/scripts/deploy/health-check.sh
```

### Health Check Endpoints

```bash
# Server health
curl http://localhost:3000/health

# IDE health
curl http://localhost:8080/healthz

# Database health
sqlite3 /opt/miaoda/data/miaoda.db "PRAGMA integrity_check;"
```

### Uptime Monitoring

Use external services:

- **UptimeRobot**: https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

## Metrics

### Application Metrics

#### HTTP Metrics

```javascript
// Example: Expose metrics endpoint
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

#### Database Metrics

```javascript
const databaseSize = new prometheus.Gauge({
  name: 'database_size_bytes',
  help: 'Size of database in bytes'
});

const databaseConnections = new prometheus.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});
```

#### Custom Business Metrics

```javascript
const activeUsers = new prometheus.Gauge({
  name: 'active_users_total',
  help: 'Number of active users'
});

const projectsCreated = new prometheus.Counter({
  name: 'projects_created_total',
  help: 'Total number of projects created'
});
```

### Query Examples

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# CPU usage
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

## Best Practices

### 1. Metric Naming

- Use descriptive names
- Follow Prometheus naming conventions
- Include units in metric names
- Use labels for dimensions

### 2. Alert Design

- Alert on symptoms, not causes
- Set appropriate thresholds
- Avoid alert fatigue
- Include actionable information
- Test alerts regularly

### 3. Dashboard Design

- Start with overview dashboards
- Create role-specific dashboards
- Use consistent time ranges
- Include context and documentation
- Keep dashboards simple

### 4. Data Retention

```yaml
# Prometheus retention
command:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=10GB'
```

### 5. Security

```yaml
# Enable authentication
global:
  external_labels:
    cluster: 'production'

# Use TLS
tls_config:
  cert_file: /etc/prometheus/cert.pem
  key_file: /etc/prometheus/key.pem
```

### 6. Performance

- Use recording rules for expensive queries
- Limit cardinality of labels
- Use appropriate scrape intervals
- Monitor Prometheus itself

## Monitoring Checklist

- [ ] Prometheus installed and running
- [ ] Grafana installed and configured
- [ ] Data sources configured
- [ ] Dashboards created
- [ ] Alert rules defined
- [ ] Alertmanager configured
- [ ] Notification channels tested
- [ ] Health checks automated
- [ ] Log aggregation setup
- [ ] Backup monitoring configured
- [ ] Documentation updated
- [ ] Team trained on dashboards

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
