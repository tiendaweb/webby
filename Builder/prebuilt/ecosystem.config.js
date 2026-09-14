module.exports = {
  apps: [
    {
      name: 'webby-builder',
      script: '/opt/webby/Builder/prebuilt/webby-builder-linux',
      cwd: '/opt/webby/Builder/prebuilt',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/webby-builder-error.log',
      out_file: '/var/log/webby-builder-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'development',
        NPM_CONFIG_PRODUCTION: 'false',
        NPM_CONFIG_INCLUDE: 'dev'
      }
    }
  ]
};
