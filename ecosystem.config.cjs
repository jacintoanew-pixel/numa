// ==============================================================================
// NUMA — CONFIGURACIÓN PM2 PROCESS MANAGER (PRODUCCIÓN DIRECTA EN VPS)
// ==============================================================================

module.exports = {
  apps: [
    {
      name: "numa",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "250M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
    },
  ],
};
