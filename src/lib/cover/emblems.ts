import type { Emblem } from "@/types";
import { MARK } from "@/lib/brand";

/**
 * Line-art emblems for covers & spines, drawn into a canvas in a 100×100 box
 * centred on the origin (-50..50). The caller sets stroke/fill style (foil,
 * ink or a roughness value for the ORM pass) and the transform.
 */
type Ctx = CanvasRenderingContext2D;

function strokeLine(ctx: Ctx, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

const draw: Record<Emblem, (ctx: Ctx) => void> = {
  rain(ctx) {
    // cloud
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.bezierCurveTo(-44, 0, -44, -18, -30, -18);
    ctx.bezierCurveTo(-28, -34, -6, -38, 2, -24);
    ctx.bezierCurveTo(10, -36, 34, -32, 32, -14);
    ctx.bezierCurveTo(46, -12, 44, 4, 30, 4);
    ctx.closePath();
    ctx.stroke();
    // drops
    for (let i = 0; i < 5; i++) {
      const x = -24 + i * 12;
      const y = 14 + (i % 2) * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 4, y + 8, x, y + 11);
      ctx.quadraticCurveTo(x - 4, y + 8, x, y);
      ctx.fill();
    }
  },
  compass(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 33, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r1 = i % 4 === 0 ? 26 : 30;
      strokeLine(ctx, [
        [Math.cos(a) * r1, Math.sin(a) * r1],
        [Math.cos(a) * 33, Math.sin(a) * 33],
      ]);
    }
    // star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 30 : 7;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  },
  waves(ctx) {
    for (let row = 0; row < 4; row++) {
      ctx.beginPath();
      const y = -24 + row * 16;
      for (let x = -42; x <= 42; x += 2) {
        const yy = y + Math.sin((x + row * 9) / 7) * 5;
        if (x === -42) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // curling crest
    ctx.beginPath();
    ctx.arc(18, -34, 9, Math.PI, Math.PI * 2.6);
    ctx.stroke();
  },
  lamp(ctx) {
    // lantern
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.lineTo(14, -26);
    ctx.lineTo(20, 22);
    ctx.lineTo(-20, 22);
    ctx.closePath();
    ctx.stroke();
    strokeLine(ctx, [
      [-24, 22],
      [24, 22],
    ]);
    strokeLine(ctx, [
      [-18, 30],
      [18, 30],
    ]);
    ctx.beginPath();
    ctx.arc(0, -34, 8, Math.PI, 0);
    ctx.stroke();
    strokeLine(ctx, [
      [0, -42],
      [0, -48],
    ]);
    // flame
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(9, 0, 7, 12, 0, 14);
    ctx.bezierCurveTo(-7, 12, -9, 0, 0, -12);
    ctx.fill();
    // rays
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      strokeLine(ctx, [
        [Math.cos(a) * 30, Math.sin(a) * 30 + 2],
        [Math.cos(a) * 40, Math.sin(a) * 40 + 2],
      ]);
    }
  },
  moth(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 2, 4, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.bezierCurveTo(s * 20, -40, s * 50, -30, s * 44, -6);
      ctx.bezierCurveTo(s * 40, 4, s * 16, 2, 0, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.bezierCurveTo(s * 30, 6, s * 38, 26, s * 22, 32);
      ctx.bezierCurveTo(s * 12, 34, s * 4, 20, 0, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 26, -16, 6, 0, Math.PI * 2);
      ctx.stroke();
      strokeLine(ctx, [
        [0, -18],
        [s * 10, -36],
      ]);
    }
  },
  key(ctx) {
    ctx.beginPath();
    ctx.arc(-24, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-24, 0, 6, 0, Math.PI * 2);
    ctx.stroke();
    strokeLine(ctx, [
      [-10, 0],
      [40, 0],
    ]);
    strokeLine(ctx, [
      [28, 0],
      [28, 12],
    ]);
    strokeLine(ctx, [
      [36, 0],
      [36, 9],
    ]);
    strokeLine(ctx, [
      [20, 0],
      [20, 7],
    ]);
  },
  shelf(ctx) {
    // the StoryShelf mark (src/lib/brand.ts), scaled from its 48-unit box
    const k = 2.05;
    ctx.scale(k, k);
    ctx.translate(-24, -25);
    ctx.lineWidth /= k;
    for (const d of MARK.strokes) ctx.stroke(new Path2D(d));
    for (const [x, y] of MARK.sparks) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  circuit(ctx) {
    // a circuit tree: trunk with branching traces ending in pads
    strokeLine(ctx, [
      [0, 42],
      [0, -6],
    ]);
    const branches: [number, number][][] = [
      [
        [0, 6],
        [-14, -8],
        [-14, -26],
      ],
      [
        [0, 6],
        [14, -8],
        [14, -26],
      ],
      [
        [0, -6],
        [0, -38],
      ],
      [
        [0, 18],
        [-26, -8],
        [-34, -8],
      ],
      [
        [0, 18],
        [26, -8],
        [34, -8],
      ],
      [
        [-14, -14],
        [-26, -26],
        [-26, -34],
      ],
      [
        [14, -14],
        [26, -26],
        [26, -34],
      ],
      [
        [0, 28],
        [-36, 10],
      ],
      [
        [0, 28],
        [36, 10],
      ],
    ];
    for (const b of branches) {
      strokeLine(ctx, b);
      const [ex, ey] = b[b.length - 1];
      ctx.beginPath();
      ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // roots
    strokeLine(ctx, [
      [0, 42],
      [-12, 46],
    ]);
    strokeLine(ctx, [
      [0, 42],
      [12, 46],
    ]);
  },
  snowflake(ctx) {
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * Math.PI * 2);
      strokeLine(ctx, [
        [0, 0],
        [0, -42],
      ]);
      strokeLine(ctx, [
        [0, -16],
        [-9, -26],
      ]);
      strokeLine(ctx, [
        [0, -16],
        [9, -26],
      ]);
      strokeLine(ctx, [
        [0, -28],
        [-7, -36],
      ]);
      strokeLine(ctx, [
        [0, -28],
        [7, -36],
      ]);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.stroke();
  },
  leaf(ctx) {
    // arched garden gate with a leaf
    ctx.beginPath();
    ctx.moveTo(-30, 40);
    ctx.lineTo(-30, -10);
    ctx.arc(0, -10, 30, Math.PI, 0);
    ctx.lineTo(30, 40);
    ctx.stroke();
    for (let x = -20; x <= 20; x += 10) {
      strokeLine(ctx, [
        [x, 40],
        [x, -4 - Math.sqrt(Math.max(0, 900 - x * x)) * 0.8],
      ]);
    }
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.bezierCurveTo(-2, -16, 18, -18, 22, -24);
    ctx.bezierCurveTo(22, -4, 8, 10, -8, 8);
    ctx.fill();
  },
  flame(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.bezierCurveTo(22, -18, 30, 6, 18, 26);
    ctx.bezierCurveTo(10, 40, -10, 40, -18, 26);
    ctx.bezierCurveTo(-28, 8, -14, -6, -8, -16);
    ctx.bezierCurveTo(-6, -4, 0, -2, 2, -10);
    ctx.bezierCurveTo(4, -22, 0, -32, 0, -44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(12, 14, 10, 30, 0, 32);
    ctx.bezierCurveTo(-10, 30, -10, 16, 0, 2);
    ctx.fill();
    // crown
    strokeLine(ctx, [
      [-22, 44],
      [22, 44],
    ]);
  },
  quill(ctx) {
    ctx.beginPath();
    ctx.moveTo(-30, 40);
    ctx.bezierCurveTo(-10, 10, 10, -20, 36, -44);
    ctx.bezierCurveTo(30, -18, 14, 8, -24, 34);
    ctx.closePath();
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = 0.2 + i * 0.1;
      const x = -30 + 66 * t;
      const y = 40 - 84 * t;
      strokeLine(ctx, [
        [x, y],
        [x - 8 + i, y - 4 - i],
      ]);
    }
    strokeLine(ctx, [
      [-30, 40],
      [-38, 46],
    ]);
    // ink drop
    ctx.beginPath();
    ctx.arc(-38, 46, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  tree(ctx) {
    strokeLine(ctx, [
      [0, 44],
      [0, 4],
    ]);
    const limb = (x: number, y: number, a: number, len: number, depth: number) => {
      if (depth === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      strokeLine(ctx, [
        [x, y],
        [x2, y2],
      ]);
      limb(x2, y2, a - 0.45, len * 0.68, depth - 1);
      limb(x2, y2, a + 0.45, len * 0.68, depth - 1);
    };
    limb(0, 4, -Math.PI / 2, 18, 4);
  },
};

/**
 * Draw an emblem centred at (cx, cy) fitted to `size` (box side).
 * lineWidth is given in the box's own units (100 = full size).
 */
export function drawEmblem(ctx: Ctx, emblem: Emblem, cx: number, cy: number, size: number, lineWidth = 2.4) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 100;
  ctx.scale(s, s);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw[emblem](ctx);
  ctx.restore();
}
