/**
 * ROOM PAINTER REGISTRY (extension point — plan §3.2).
 *
 * OWNED BY: P3-R (Room Painter).
 *
 * Imported ONCE by renderer2d.ts. Room painters register themed floor/furniture/
 * marker treatments per RoomTheme; board.ts currently draws a palette-driven
 * generic room, and a registered room painter can override or augment it later.
 *
 * TO REGISTER a room treatment, add a file in THIS folder and one import line
 * below — never edit renderer2d.ts or board.ts:
 *
 *   // src/render2d/painters/rooms/kitchen.ts
 *   import { registerRoomPainter } from '../../spriteCache';
 *   registerRoomPainter('kitchen', (ctx, size, frame, opts) => { ... });
 *
 *   // then here:
 *   import './kitchen';
 *
 * (Room painters that need whole-board context rather than a sprite box should
 * coordinate the exact hook with P2-I; this registry is the sprite-based path.)
 */

export {};
