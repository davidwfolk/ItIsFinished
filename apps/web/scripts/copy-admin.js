import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDist = path.resolve(__dirname, '../../admin/dist');
const webDistAdmin = path.resolve(__dirname, '../dist/admin');

if (!fs.existsSync(adminDist)) {
  console.error(`[copy-admin] Error: admin dist directory not found at: ${adminDist}`);
  console.error('[copy-admin] Make sure apps/admin was built before running this script.');
  process.exit(1);
}

try {
  fs.mkdirSync(webDistAdmin, { recursive: true });
  fs.cpSync(adminDist, webDistAdmin, { recursive: true });
  console.log(`[copy-admin] Successfully copied admin bundle into ${webDistAdmin}`);
} catch (err) {
  console.error('[copy-admin] Failed to copy admin bundle:', err);
  process.exit(1);
}
