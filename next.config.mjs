import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Re-use the CommonJS production-safe config when running in ESM.
const config = require('./next.config.cjs');
export default config;
