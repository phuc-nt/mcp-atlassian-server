# MCP Atlassian Server - Docker & IntelliJ Copilot Setup Guide

This guide walks you through running the MCP Atlassian Server in Docker and configuring it with the IntelliJ Copilot plugin.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Setup](#docker-setup)
3. [IntelliJ Copilot Configuration](#intellij-copilot-configuration)
4. [Troubleshooting](#troubleshooting)
5. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Required
- **Docker** (version 20.10+): [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (version 1.29+): Usually included with Docker Desktop
- **IntelliJ IDEA** (2023.1+) with Copilot plugin installed
- **Atlassian Credentials:**
  - Jira/Confluence instance URL
  - Email associated with your Atlassian account
  - API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens)

### Optional
- Docker Desktop UI for easier container management
- `curl` or `Postman` for testing API endpoints

---

## Docker Setup

### 1. Prepare Environment Variables

Create a `.env` file in the repository root:

```bash
cp .env.example .env
```

Edit `.env` with your Atlassian credentials:

```env
ATLASSIAN_URL=https://your-instance.atlassian.net
ATLASSIAN_EMAIL=your-email@example.com
ATLASSIAN_API_TOKEN=your-api-token-here
NODE_ENV=production
PORT=3000
```

⚠️ **Security Warning**: Never commit `.env` files to version control. Use `.env` only locally.

### 2. Build and Start the Docker Container

#### Using Docker Compose (Recommended)

```bash
# Build the image
docker-compose build

# Start the container in the background
docker-compose up -d

# View logs
docker-compose logs -f mcp-atlassian-server

# Stop the container
docker-compose down
```

#### Using Docker CLI

```bash
# Build the image
docker build -t mcp-atlassian-server:latest .

# Run the container
docker run -d \
  --name mcp-atlassian-server \
  -p 3000:3000 \
  --env-file .env \
  mcp-atlassian-server:latest

# View logs
docker logs -f mcp-atlassian-server

# Stop the container
docker stop mcp-atlassian-server
docker rm mcp-atlassian-server
```

### 3. Verify Container is Running

```bash
# Check container status
docker ps | grep mcp-atlassian-server

# Test health check
docker exec mcp-atlassian-server node -e "console.log('healthy')"

# View detailed logs
docker logs mcp-atlassian-server
```

---

## IntelliJ Copilot Configuration

### 1. Install IntelliJ Copilot Plugin

1. Open IntelliJ IDEA
2. Go to **Settings** → **Plugins**
3. Search for "Copilot"
4. Install the official **GitHub Copilot** plugin
5. Restart IDE

### 2. Configure MCP Server in IntelliJ

IntelliJ Copilot supports MCP servers through configuration. You have two options:

#### Option A: Via Configuration File (Recommended for Docker)

1. Locate IntelliJ settings directory:
   - **macOS/Linux**: `~/.config/JetBrains/IntelliJ*/options/`
   - **Windows**: `%APPDATA%\JetBrains\IntelliJ*\options\`

2. Create or edit `ai.suggestions.settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<application>
  <component name="AiSuggestionsSettings">
    <mcp_servers>
      <server>
        <name>MCP Atlassian Server</name>
        <type>stdio</type>
        <command>docker</command>
        <args>exec mcp-atlassian-server node dist/index.js</args>
        <env>
          <ATLASSIAN_URL>https://your-instance.atlassian.net</ATLASSIAN_URL>
          <ATLASSIAN_EMAIL>your-email@example.com</ATLASSIAN_EMAIL>
          <ATLASSIAN_API_TOKEN>your-api-token</ATLASSIAN_API_TOKEN>
        </env>
        <enabled>true</enabled>
      </server>
    </mcp_servers>
  </component>
</application>
```

#### Option B: Via HTTP Bridge (Alternative)

If you want to run the MCP server via HTTP instead of stdio:

1. Modify `docker-compose.yml` to expose an HTTP port
2. Create an HTTP-to-stdio bridge using a tool like [mcp-server-stdio-bridge](https://github.com/modelcontextprotocol/servers)
3. Configure IntelliJ to connect to `http://localhost:3000`

### 3. Enable MCP in Copilot Settings

1. Open **Settings** → **Copilot** in IntelliJ
2. Enable **MCP Support** (if available)
3. Add MCP Server Configuration
4. Set the server to **MCP Atlassian Server**
5. Click **Apply** and **OK**

### 4. Test the Integration

In IntelliJ:

1. Open any file in your project
2. Press `Ctrl+Shift+A` (macOS: `Cmd+Shift+A`) to open Quick Actions
3. Search for "Copilot" or press the Copilot hotkey
4. Ask a question related to Jira/Confluence:
   - "List my assigned Jira issues"
   - "Get the latest Confluence page from DEMO space"
5. Copilot should now query your Atlassian instance through the MCP server

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs mcp-atlassian-server

# Verify environment variables
docker exec mcp-atlassian-server env | grep ATLASSIAN
```

**Common Issues:**
- Missing or incorrect `.env` file
- Port 3000 already in use: Change `PORT` in `.env` or stop conflicting container
- Invalid Atlassian credentials: Verify token and URL

### IntelliJ Not Connecting to MCP Server

1. Verify container is running: `docker ps | grep mcp-atlassian-server`
2. Check container logs: `docker logs mcp-atlassian-server`
3. Restart IntelliJ and try again
4. Clear IntelliJ cache: **File** → **Invalidate Caches**

### "Connection Refused" Error

- Ensure Docker container is running
- Check if port 3000 is accessible
- Try: `curl http://localhost:3000/health` (if health endpoint exists)

### MCP Server Not Appearing in IntelliJ

1. Verify plugin is installed and enabled
2. Check configuration file syntax in `.xml`
3. Restart IntelliJ completely
4. Check IDE logs: **Help** → **Show Log in Finder/Explorer**

---

## Advanced Configuration

### 1. Use Environment-Specific Configurations

Create separate env files for different environments:

```bash
cp .env.example .env.production
cp .env.example .env.development
```

Then start with a specific env file:

```bash
docker-compose --env-file .env.production up -d
```

### 2. Add Container Persistence

Mount volumes to persist logs or cache:

```yaml
volumes:
  - ./logs:/app/logs
  - ./cache:/app/cache
```

### 3. Set Resource Limits

Uncomment the `deploy` section in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

### 4. Enable Container Networking

To access the container from other services:

```yaml
networks:
  mcp-network:
    driver: bridge
```

### 5. Add SSL/TLS Support

If using HTTPS, add certificates to the container:

```yaml
volumes:
  - ./certs:/app/certs:ro
environment:
  - SSL_CERT_FILE=/app/certs/cert.pem
  - SSL_KEY_FILE=/app/certs/key.pem
```

### 6. Enable Debug Logging

Add debug environment variable:

```env
DEBUG=mcp-atlassian-server:*
```

Or via docker-compose:

```yaml
environment:
  - DEBUG=mcp-atlassian-server:*
```

---

## Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs in real-time
docker logs -f mcp-atlassian-server

# Execute command inside container
docker exec mcp-atlassian-server npm list

# Stop container
docker stop mcp-atlassian-server

# Restart container
docker restart mcp-atlassian-server

# Remove container
docker rm mcp-atlassian-server

# View container resource usage
docker stats mcp-atlassian-server

# View container details
docker inspect mcp-atlassian-server

# Clean up unused images and containers
docker system prune -a
```

---

## Next Steps

1. ✅ Container running
2. ✅ IntelliJ configured
3. 🎯 Start using MCP Atlassian Server in Copilot!

For more information:
- [MCP Documentation](https://modelcontextprotocol.io/)
- [IntelliJ Copilot Help](https://www.jetbrains.com/help/idea/copilot.html)
- [Original Project Repository](https://github.com/phuc-nt/mcp-atlassian-server)

---

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review container logs
3. Verify Atlassian credentials are correct
4. Open an issue on GitHub with logs and error messages