/**
 * Node 21+ removed SlowBuffer; buffer-equal-constant-time (via jwa/jsonwebtoken)
 * still references it. Map SlowBuffer → Buffer before those packages load.
 */
import { Buffer } from 'buffer';

const g = globalThis as typeof globalThis & { SlowBuffer?: typeof Buffer };
if (typeof g.SlowBuffer === 'undefined') {
  g.SlowBuffer = Buffer;
}
