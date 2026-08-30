import { readFileSync } from 'fs';
import { join } from 'path';

describe('start:local', () => {
  it('deve carregar .env.local opcionalmente sem sobrescrever .env', () => {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf8'),
    ) as {
      engines: { node: string };
      scripts: Record<string, string>;
    };
    const script = packageJson.scripts['start:local'];

    expect(packageJson.engines.node).toBe('>=20.19.0');
    expect(script).toContain('--env-file-if-exists=.env.local');
    expect(script).toContain("process.env.NODE_ENV = 'development'");
    expect(script).not.toMatch(/^NODE_ENV=/);
    expect(script).not.toMatch(/\bcp\s+\.env\.local\s+\.env\b/);
  });
});
