import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MinecraftRconService } from './minecraft-rcon/minecraft-rcon.service';

export interface HealthData {
  status: 'healthy' | 'degraded';
  project: string;
  service: string;
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  database: {
    status: 'connected' | 'error';
    type: string;
    latency: string;
  };
  minecraft: {
    status: 'online' | 'offline';
    playersOnline: number;
    players: string[];
  };
  system: {
    nodeVersion: string;
    platform: string;
    environment: string;
    memory: {
      rss: string;
      heapUsed: string;
      heapTotal: string;
    };
  };
  endpoints: {
    healthcheck: string;
    website: string;
  };
}

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rconService: MinecraftRconService,
  ) {}

  public async getHealthData(): Promise<HealthData> {
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    const formattedUptime = [
      days > 0 ? `${days}d ` : null,
      hours > 0 ? `${hours}h ` : null,
      minutes > 0 ? `${minutes}m ` : null,
      `${seconds}s`,
    ]
      .filter(Boolean)
      .join('');

    let dbStatus: 'connected' | 'error' = 'connected';
    let dbLatencyStr = 'N/A';
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      dbLatencyStr = `${Date.now() - start}ms`;
    } catch {
      dbStatus = 'error';
      dbLatencyStr = 'unreachable';
    }

    let mcStatus: { online: boolean; playersCount: number; players: string[] } = {
      online: false,
      playersCount: 0,
      players: [],
    };
    try {
      const res = await this.rconService.getOnlinePlayers();
      mcStatus = {
        online: res.online,
        playersCount: res.playersCount,
        players: res.players,
      };
    } catch {
      mcStatus = { online: false, playersCount: 0, players: [] };
    }

    const memory = process.memoryUsage();
    const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

    const isHealthy = dbStatus === 'connected';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      project: 'Chronicles of the End',
      service: 'NestJS Backend API',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: formattedUptime,
      },
      database: {
        status: dbStatus,
        type: 'PostgreSQL 16',
        latency: dbLatencyStr,
      },
      minecraft: {
        status: mcStatus.online ? 'online' : 'offline',
        playersOnline: mcStatus.playersCount,
        players: mcStatus.players,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'production',
        memory: {
          rss: formatMB(memory.rss),
          heapUsed: formatMB(memory.heapUsed),
          heapTotal: formatMB(memory.heapTotal),
        },
      },
      endpoints: {
        healthcheck: '/healthcheck',
        website: 'https://khroniki-kraya.com',
      },
    };
  }

  public async getRootHtml(): Promise<string> {
    const health = await this.getHealthData();

    const dbLatency = health.database.latency;
    const dbValue = health.database.status === 'connected' ? `Connected • ${dbLatency}` : 'Disconnected';
    const mcPlayers = health.minecraft.playersOnline;
    const isMcOnline = health.minecraft.status === 'online';
    const mcValue = isMcOnline ? `Online • ${mcPlayers} ${mcPlayers === 1 ? 'player' : 'players'}` : 'Offline';
    const uptimeStr = health.uptime.formatted;
    const heapStr = health.system.memory.heapUsed;
    const nodeVer = health.system.nodeVersion;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chronicles of the End — Backend</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Minecraft';
      src: url('data:font/woff2;base64,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') format('woff2');
      font-weight: normal;
      font-style: normal;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      color: #f8fafc;
      background-color: #0c0809;
      background-image: 
        radial-gradient(ellipse at 50% 38%, rgba(220, 38, 38, 0.26) 0%, rgba(194, 65, 12, 0.18) 45%, rgba(12, 7, 9, 0.76) 100%),
        linear-gradient(rgba(18, 9, 11, 0.45), rgba(12, 6, 8, 0.65)),
        url('/bg.jpg');
      background-position: center;
      background-size: cover;
      background-attachment: fixed;
    }

    .card {
      background: rgba(24, 15, 18, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(239, 68, 68, 0.28);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 45px rgba(220, 38, 38, 0.16), inset 0 1px 0 rgba(254, 202, 202, 0.08);
      padding: 44px 38px 36px;
      width: 100%;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(220, 38, 38, 0.16);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.35);
      margin-bottom: 18px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444, 0 0 4px #dc2626;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .card__title {
      font-family: 'Minecraft', monospace, sans-serif;
      font-size: 28px;
      font-weight: normal;
      color: #ffffff;
      margin-bottom: 10px;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 14px rgba(220, 38, 38, 0.45);
    }

    .card__desc {
      color: #d1a3a4;
      font-size: 14.5px;
      line-height: 1.6;
      margin-bottom: 24px;
      max-width: 540px;
    }

    .warning-box {
      background: rgba(194, 65, 12, 0.14);
      border: 1px solid rgba(234, 88, 12, 0.35);
      border-left: 4px solid #ea580c;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 24px;
      text-align: left;
      font-size: 13.5px;
      color: #fed7aa;
      line-height: 1.55;
      width: 100%;
    }

    .warning-box strong {
      color: #fb923c;
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 28px;
    }

    .metric-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      background: rgba(36, 20, 24, 0.65);
      border: 1px solid rgba(239, 68, 68, 0.16);
      text-align: left;
      transition: all 0.15s ease;
    }

    .metric-item:hover {
      border-color: rgba(239, 68, 68, 0.38);
      background: rgba(50, 26, 32, 0.8);
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15);
    }



    .metric-icon {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: rgba(220, 38, 38, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #f87171;
      transition: all 0.15s ease;
    }

    .metric-item:hover .metric-icon {
      color: #fca5a5;
      background: rgba(220, 38, 38, 0.22);
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
    }

    .metric-icon svg {
      width: 17px;
      height: 17px;
      stroke: currentColor;
    }

    .metric-info {
      flex: 1;
      min-width: 0;
    }

    .metric-label {
      font-size: 11px;
      color: #fda4af;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #f1f5f9;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metric-value--online {
      color: #f87171;
      text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }

    .action-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      width: 100%;
    }

    .btn-action {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #c2410c 100%);
      color: #ffffff;
      font-family: 'Minecraft', -apple-system, sans-serif;
      font-size: 16.5px;
      padding: 15px 44px;
      border-radius: 12px;
      text-decoration: none;
      display: inline-block;
      transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 4px 18px rgba(220, 38, 38, 0.4), 0 0 20px rgba(194, 65, 12, 0.25);
      cursor: pointer;
    }

    .btn-action:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 40%, #9a3412 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 26px rgba(220, 38, 38, 0.55), 0 0 25px rgba(194, 65, 12, 0.35);
    }

    .hint-text {
      font-size: 12.5px;
      color: #e2a8a8;
    }

    .hint-text code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(220, 38, 38, 0.12);
      padding: 2px 7px;
      border-radius: 5px;
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .links-footer {
      display: flex;
      gap: 16px;
      margin-top: 6px;
      font-size: 13px;
    }

    .links-footer a {
      color: #fca5a5;
      text-decoration: none;
      transition: color 0.15s;
    }

    .links-footer a:hover {
      color: #fb923c;
    }

    @media (max-width: 600px) {
      .card {
        padding: 30px 20px;
      }
      .grid {
        grid-template-columns: 1fr;
      }
      .btn-action {
        width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="badge-status">
      <span class="pulse-dot"></span>
      <span>All Systems Operational</span>
    </div>

    <h1 class="card__title">Chronicles of the End • Backend</h1>
    <p class="card__desc">
      Central server node for economy, state governance, and Minecraft integrations
    </p>

    <div class="warning-box">
      <strong>🛑 Restricted Area — Players Not Allowed!</strong>
      You have stumbled upon the internal backend engine for Chronicles of the End. Exchange engines, central banks, and automated tax systems operate here. Grab your pickaxe and return to the game to build your empire, or visit our main website!
    </div>

    <div class="grid">
      <div class="metric-item">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <div class="metric-info">
          <div class="metric-label">PostgreSQL Database</div>
          <div class="metric-value">${dbValue}</div>
        </div>
      </div>

      <div class="metric-item">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
        </div>
        <div class="metric-info">
          <div class="metric-label">Minecraft Server</div>
          <div class="metric-value ${isMcOnline ? 'metric-value--online' : ''}">${mcValue}</div>
        </div>
      </div>

      <div class="metric-item">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="metric-info">
          <div class="metric-label">Process Uptime</div>
          <div class="metric-value">${uptimeStr}</div>
        </div>
      </div>

      <div class="metric-item">
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="9" y="9" width="6" height="6"/>
            <line x1="9" y1="1" x2="9" y2="4"/>
            <line x1="15" y1="1" x2="15" y2="4"/>
            <line x1="9" y1="20" x2="9" y2="23"/>
            <line x1="15" y1="20" x2="15" y2="23"/>
            <line x1="20" y1="9" x2="23" y2="9"/>
            <line x1="20" y1="14" x2="23" y2="14"/>
            <line x1="1" y1="9" x2="4" y2="9"/>
            <line x1="1" y1="14" x2="4" y2="14"/>
          </svg>
        </div>
        <div class="metric-info">
          <div class="metric-label">Runtime & Memory</div>
          <div class="metric-value">Node ${nodeVer} • ${heapStr}</div>
        </div>
      </div>
    </div>

    <div class="action-container">
      <a href="/healthcheck" class="btn-action">
        Open /healthcheck
      </a>
      <span class="hint-text">
        Need raw system diagnostics? Query the <code>/healthcheck</code> endpoint
      </span>
      <div class="links-footer">
        <a href="https://khroniki-kraya.com" target="_blank">🌐 Main Website</a>
      </div>
    </div>
  </div>

</body>
</html>`;
  }
}
