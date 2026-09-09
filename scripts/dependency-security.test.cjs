const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

// Regressão offline dos advisories remediados; não substitui npm audit atualizado.
const minimums = {
  api: {
    multer: '2.3.0',
    mysql2: '3.24.0',
    browserslist: '4.28.7',
    'baseline-browser-mapping': '2.11.0',
    'fast-uri': '3.1.6',
    qs: '6.16.0',
  },
  web: {
    browserslist: '4.28.7',
    'baseline-browser-mapping': '2.11.0',
    'fast-uri': '3.1.6',
    qs: '6.16.0',
  },
};

for (const [project, dependencies] of Object.entries(minimums)) {
  const lock = JSON.parse(
    readFileSync(join(__dirname, '..', project, 'package-lock.json'), 'utf8'),
  );

  for (const [name, minimum] of Object.entries(dependencies)) {
    test(`${project}: todas as cópias de ${name} estão corrigidas na mesma major`, () => {
      const copies = Object.entries(lock.packages).filter(([path]) =>
        path.endsWith(`node_modules/${name}`),
      );
      assert.ok(copies.length > 0, `${name} ausente: revisar a cadeia`);
      for (const [path, { version }] of copies) {
        assert.match(version, /^\d+\.\d+\.\d+$/);
        const [major, minor, patch] = version.split('.').map(Number);
        const [safeMajor, safeMinor, safePatch] = minimum.split('.').map(Number);
        assert.equal(major, safeMajor, `${path}: mudança de major requer revisão`);
        assert.ok(
          minor > safeMinor || (minor === safeMinor && patch >= safePatch),
          `${path}: ${version} vulnerável, mínimo ${minimum}`,
        );
      }
    });
  }
}

test('web: override de fast-uri não reinstala uma versão vulnerável', () => {
  const manifest = JSON.parse(
    readFileSync(join(__dirname, '../web/package.json'), 'utf8'),
  );
  assert.equal(manifest.overrides['fast-uri@>=3.0.0 <3.1.5'], undefined);
  assert.equal(manifest.overrides['fast-uri@>=3.0.0 <3.1.7'], '3.1.7');
});

test('preserva hostinger-mail-api-sdk 1.19.1 no manifesto e no lock', () => {
  const manifest = JSON.parse(
    readFileSync(join(__dirname, '../api/package.json'), 'utf8'),
  );
  const lock = JSON.parse(
    readFileSync(join(__dirname, '../api/package-lock.json'), 'utf8'),
  );
  assert.equal(manifest.dependencies['hostinger-mail-api-sdk'], '1.19.1');
  assert.equal(lock.packages[''].dependencies['hostinger-mail-api-sdk'], '1.19.1');
  assert.equal(lock.packages['node_modules/hostinger-mail-api-sdk'].version, '1.19.1');
});