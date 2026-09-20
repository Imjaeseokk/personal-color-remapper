// Build the small code-drawn toolbar icon without graphics/runtime dependencies.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
function crc32(bytes) { let c = 0xffffffff; for (const byte of bytes) { c ^= byte; for (let i=0;i<8;i++) c = (c>>>1) ^ (0xedb88320 & -(c&1)); } return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([length, name, data, crc]); }
await mkdir(new URL('../icons/', import.meta.url), { recursive: true });
for (const size of [16,32,48,128]) {
  const pixels = Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const padding = size === 128 ? 16 : 0;
    const u=(x+.5-padding)/(size-2*padding), v=(y+.5-padding)/(size-2*padding);
    let rgba=[35,71,117,255];
    const radius=.2, dx=Math.max(radius-u, u-(1-radius),0), dy=Math.max(radius-v,v-(1-radius),0);
    if(dx*dx+dy*dy>radius*radius) rgba=[0,0,0,0];
    else if(u>.18&&u<.38&&v>.28&&v<.72) rgba=[109,191,255,255];
    else if(u>.62&&u<.82&&v>.28&&v<.72) rgba=[213,183,255,255];
    else if(u>.42&&u<.59&&Math.abs(v-.5)<.04 || u>.51&&u<.62&&Math.abs(v-.5)<(.62-u)*.8) rgba=[255,255,255,255];
    const offset=y*(size*4+1)+1+x*4; pixels.set(rgba,offset);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(new URL(`../icons/icon-${size}.png`,import.meta.url),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
