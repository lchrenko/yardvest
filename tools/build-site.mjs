import { cp, mkdir, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Publish only browser assets; database migrations and development files stay private to the build.
for (const name of ['index.html', 'styles.css', 'app.js', 'config.js', 'chat.js', 'maps.js', 'project-os.js', 'assets']) {
  await cp(new URL(`../${name}`, import.meta.url), new URL(name, output), { recursive: true });
}
console.log('Static YardVest site built in dist.');
