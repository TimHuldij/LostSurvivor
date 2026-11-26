import * as THREE from 'three';

// A local grid is built from the same static collision boxes used by the player.
export class NavigationGrid {
  constructor(solids, { minX = -21, maxX = 21, minZ = -26, maxZ = 22, cellSize = .8 } = {}) {
    this.minX = minX;
    this.minZ = minZ;
    this.cellSize = cellSize;
    this.width = Math.floor((maxX - minX) / cellSize) + 1;
    this.height = Math.floor((maxZ - minZ) / cellSize) + 1;
    this.blocked = new Uint8Array(this.width * this.height);
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const point = this.point(x, z);
        this.blocked[z * this.width + x] = Number(solids.some(box =>
          box.max.y > .3 && box.min.y < 1.7 &&
          point.x > box.min.x - .37 && point.x < box.max.x + .37 &&
          point.z > box.min.z - .37 && point.z < box.max.z + .37));
      }
    }
  }

  point(x, z) {
    return new THREE.Vector3(this.minX + x * this.cellSize, 0, this.minZ + z * this.cellSize);
  }

  cell(point) {
    return {
      x: THREE.MathUtils.clamp(Math.round((point.x - this.minX) / this.cellSize), 0, this.width - 1),
      z: THREE.MathUtils.clamp(Math.round((point.z - this.minZ) / this.cellSize), 0, this.height - 1),
    };
  }

  findPath(start, destination, obstacles = []) {
    const from = this.cell(start);
    const to = this.cell(destination);
    const first = from.z * this.width + from.x;
    const goal = to.z * this.width + to.x;
    const blocked = this.blocked.slice();
    for (const box of obstacles) {
      if (box.max.y <= .3 || box.min.y >= 1.7) continue;
      const minX = Math.max(0, Math.floor((box.min.x - .37 - this.minX) / this.cellSize));
      const maxX = Math.min(this.width - 1, Math.ceil((box.max.x + .37 - this.minX) / this.cellSize));
      const minZ = Math.max(0, Math.floor((box.min.z - .37 - this.minZ) / this.cellSize));
      const maxZ = Math.min(this.height - 1, Math.ceil((box.max.z + .37 - this.minZ) / this.cellSize));
      for (let z = minZ; z <= maxZ; z++) {
        const worldZ = this.minZ + z * this.cellSize;
        if (worldZ <= box.min.z - .37 || worldZ >= box.max.z + .37) continue;
        for (let x = minX; x <= maxX; x++) {
          const worldX = this.minX + x * this.cellSize;
          if (worldX > box.min.x - .37 && worldX < box.max.x + .37) {
            blocked[z * this.width + x] = 1;
          }
        }
      }
    }
    if (blocked[goal]) return [];
    const queue = [first];
    const previous = new Int32Array(this.blocked.length).fill(-1);
    previous[first] = first;
    for (let head = 0; head < queue.length && previous[goal] === -1; head++) {
      const index = queue[head];
      const x = index % this.width;
      const z = Math.floor(index / this.width);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nx >= this.width || nz < 0 || nz >= this.height) continue;
        const next = nz * this.width + nx;
        if (blocked[next] || previous[next] !== -1) continue;
        previous[next] = index;
        queue.push(next);
      }
    }
    if (previous[goal] === -1) return [];
    const path = [];
    for (let index = goal; index !== first; index = previous[index]) {
      path.push(this.point(index % this.width, Math.floor(index / this.width)));
    }
    return path.reverse();
  }
}
