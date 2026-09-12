import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import content from '../desktop/local-content.cjs';
test('desktop origin maps absolute game assets and rejects outside paths', () => {
  const root = path.resolve('dist');
  assert.equal(content.localFile('daram://game/', root), path.join(root, 'index.html'));
  assert.equal(content.localFile('daram://game/assets/spring.mp3', root), path.join(root, 'assets/spring.mp3'));
  for (const url of ['https://game/', 'daram://other/', 'daram://game/%2e%2e%2fsecret', 'daram://game/%5csecret', 'daram://game/%00', 'daram://game/%ZZ']) {
    assert.equal(content.localFile(url, root), null, url);
  }
});
