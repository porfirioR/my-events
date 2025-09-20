// Mock para variables de entorno en tests E2E
process.env.JWT_TOKEN = 'test-jwt-secret-for-e2e';
process.env.NODE_ENV = 'test';

// Configuración global para tests E2E
jest.setTimeout(30000); // 30 segundos timeout para E2E

// Mock global para console si quieres reducir ruido en tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Mantener errores visibles
};