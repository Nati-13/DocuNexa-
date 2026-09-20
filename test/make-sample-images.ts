import * as fs from 'fs';
import * as path from 'path';

// Valid 10x10 red PNG
const redPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJAD+/v2fDLAAAAAElFTkSuQmCC';
// Valid 10x10 blue PNG
const bluePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/nwEJMDGgCvGrBQD5gwfx0/u7mAAAAABJRU5ErkJggg==';

// Minimal 1x1 JPEG
const sampleJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const outDir = path.join(__dirname, 'samples');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'page1.png'), Buffer.from(redPngBase64, 'base64'));
fs.writeFileSync(path.join(outDir, 'page2.png'), Buffer.from(bluePngBase64, 'base64'));
fs.writeFileSync(path.join(outDir, 'page3.jpg'), Buffer.from(sampleJpegBase64, 'base64'));

console.log('Sample images written successfully to test/samples');
