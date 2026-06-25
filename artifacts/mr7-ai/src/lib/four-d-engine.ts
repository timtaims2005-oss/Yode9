/**
 * 4D Mathematics Engine v4.0
 * Complete 4-dimensional transformation library for UI/visualization use.
 * Supports: rotation, projection, interpolation, and physics in 4D space.
 */

export type Vec4 = [number, number, number, number];
export type Mat4x4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export function vec4(x = 0, y = 0, z = 0, w = 0): Vec4 { return [x, y, z, w]; }
export function vec4Add(a: Vec4, b: Vec4): Vec4 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]]; }
export function vec4Scale(v: Vec4, s: number): Vec4 { return [v[0]*s, v[1]*s, v[2]*s, v[3]*s]; }
export function vec4Dot(a: Vec4, b: Vec4): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]; }
export function vec4Len(v: Vec4): number { return Math.sqrt(vec4Dot(v, v)); }
export function vec4Normalize(v: Vec4): Vec4 { const l = vec4Len(v); return l > 0 ? vec4Scale(v, 1/l) : v; }
export function vec4Lerp(a: Vec4, b: Vec4, t: number): Vec4 {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t, a[3]+(b[3]-a[3])*t];
}

export function mat4Identity(): Mat4x4 {
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
}

export function mat4Mul(a: Mat4x4, b: Mat4x4): Mat4x4 {
  const c: number[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[i*4+k] * b[k*4+j];
      c.push(sum);
    }
  }
  return c as Mat4x4;
}

export function mat4Transform(m: Mat4x4, v: Vec4): Vec4 {
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2] + m[3]*v[3],
    m[4]*v[0] + m[5]*v[1] + m[6]*v[2] + m[7]*v[3],
    m[8]*v[0] + m[9]*v[1] + m[10]*v[2] + m[11]*v[3],
    m[12]*v[0] + m[13]*v[1] + m[14]*v[2] + m[15]*v[3],
  ];
}

export function rot4DMatrix(plane: "xy"|"xz"|"xw"|"yz"|"yw"|"zw", angle: number): Mat4x4 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const m = mat4Identity();
  switch (plane) {
    case "xy": m[0]=c; m[1]=-s; m[4]=s; m[5]=c; break;
    case "xz": m[0]=c; m[2]=-s; m[8]=s; m[10]=c; break;
    case "xw": m[0]=c; m[3]=-s; m[12]=s; m[15]=c; break;
    case "yz": m[5]=c; m[6]=-s; m[9]=s; m[10]=c; break;
    case "yw": m[5]=c; m[7]=-s; m[13]=s; m[15]=c; break;
    case "zw": m[10]=c; m[11]=-s; m[14]=s; m[15]=c; break;
  }
  return m;
}

export function project4Dto3D(v: Vec4, wDist = 2): Vec3 {
  const w = wDist / (wDist - v[3]);
  return [v[0]*w, v[1]*w, v[2]*w];
}

export function project3Dto2D(v: Vec3, cx: number, cy: number, scale: number, zDist = 4): Vec2 {
  const z = zDist / (zDist - v[2]);
  return [cx + v[0]*scale*z, cy + v[1]*scale*z];
}

export function project4Dto2D(
  v: Vec4, cx: number, cy: number, scale: number,
  wDist = 2, zDist = 4,
): { pos: Vec2; depth: number } {
  const v3 = project4Dto3D(v, wDist);
  const pos = project3Dto2D(v3, cx, cy, scale, zDist);
  const depth = (v3[2] / zDist + v[3] / wDist) / 2;
  return { pos, depth };
}

export class Rotation4D {
  private angles: Record<"xy"|"xz"|"xw"|"yz"|"yw"|"zw", number> = {
    xy:0, xz:0, xw:0, yz:0, yw:0, zw:0,
  };

  setAngles(angles: Partial<typeof this.angles>): this {
    Object.assign(this.angles, angles);
    return this;
  }

  step(speeds: Partial<typeof this.angles>, dt: number): this {
    for (const [k, v] of Object.entries(speeds)) {
      const key = k as keyof typeof this.angles;
      this.angles[key] = (this.angles[key] + (v as number) * dt) % (Math.PI * 2);
    }
    return this;
  }

  matrix(): Mat4x4 {
    let m = mat4Identity();
    for (const [plane, angle] of Object.entries(this.angles)) {
      if (angle !== 0) m = mat4Mul(m, rot4DMatrix(plane as "xy", angle));
    }
    return m;
  }

  apply(v: Vec4): Vec4 {
    return mat4Transform(this.matrix(), v);
  }
}

export const TESSERACT_VERTICES: Vec4[] = [
  [-1,-1,-1,-1],[1,-1,-1,-1],[-1,1,-1,-1],[1,1,-1,-1],
  [-1,-1,1,-1], [1,-1,1,-1], [-1,1,1,-1], [1,1,1,-1],
  [-1,-1,-1,1], [1,-1,-1,1], [-1,1,-1,1], [1,1,-1,1],
  [-1,-1,1,1],  [1,-1,1,1],  [-1,1,1,1],  [1,1,1,1],
];

export const TESSERACT_EDGES: [number,number][] = [
  [0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15],
  [0,2],[1,3],[4,6],[5,7],[8,10],[9,11],[12,14],[13,15],
  [0,4],[1,5],[2,6],[3,7],[8,12],[9,13],[10,14],[11,15],
  [0,8],[1,9],[2,10],[3,11],[4,12],[5,13],[6,14],[7,15],
];

export const TESSERACT_FACES: [number,number,number,number][] = [
  [0,1,3,2],[4,5,7,6],[0,1,5,4],[2,3,7,6],[0,2,6,4],[1,3,7,5],
  [8,9,11,10],[12,13,15,14],[8,9,13,12],[10,11,15,14],[8,10,14,12],[9,11,15,13],
  [0,8,9,1],[2,10,11,3],[4,12,13,5],[6,14,15,7],[0,8,12,4],[2,10,14,6],
  [1,9,13,5],[3,11,15,7],
];

export const CROSS_POLYTOPE_VERTICES: Vec4[] = [
  [1,0,0,0],[-1,0,0,0],[0,1,0,0],[0,-1,0,0],
  [0,0,1,0],[0,0,-1,0],[0,0,0,1],[0,0,0,-1],
];

export function smoothstep4D(a: Vec4, b: Vec4, t: number): Vec4 {
  const s = t * t * (3 - 2 * t);
  return vec4Lerp(a, b, s);
}

export function orbit4D(center: Vec4, radius: number, t: number, planes: Partial<Record<"xy"|"xz"|"xw"|"yz"|"yw"|"zw", number>>): Vec4 {
  const rot = new Rotation4D().setAngles(planes);
  const point: Vec4 = [radius, 0, 0, 0];
  const rotated = rot.apply(point);
  return vec4Add(center, rotated);
}
