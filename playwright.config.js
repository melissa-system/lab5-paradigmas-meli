// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    // servidor de prueba con autenticacion simulada (tests/e2e/test-server.js);
    // puerto distinto a 3000 para no reutilizar por error el servidor real
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    // opcional: navegador ya instalado en la maquina (p. ej. en CI)
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'node tests/e2e/test-server.js',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000
  }
});
