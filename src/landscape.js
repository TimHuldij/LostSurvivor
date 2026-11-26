import * as THREE from 'three';

export function randomSource(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function makeTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function groundTexture() {
  const random = randomSource(8452);
  return makeTexture(1024, 1024, (context, size) => {
    context.fillStyle = '#626746';
    context.fillRect(0, 0, size, size);
    for (let i = 0; i < 2350; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 6 + random() * 34;
      const shade = random() < .56 ? '#3c50394a' : '#a59b6257';
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, shade);
      gradient.addColorStop(1, '#62674600');
      context.fillStyle = gradient;
      context.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
    }

    context.save();
    context.translate(size / 2, size / 2);
    context.scale(size / 116, size / 116);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-2, 28);
    context.bezierCurveTo(4, 15, 1, 6, 3, -.5);
    context.bezierCurveTo(4, -9, 10, -13, 15, -24);
    context.moveTo(2.1, 2);
    context.bezierCurveTo(-1, -5, -11, -7, -10, -24);

    for (const [width, color] of [[8.7, '#697052'], [7.1, '#7f7859'], [5.8, '#898064'], [3.8, '#a19373']]) {
      context.lineWidth = width;
      context.strokeStyle = color;
      context.stroke();
    }
    context.restore();

    for (let i = 0; i < 67000; i++) {
      const x = random() * size;
      const y = random() * size;
      context.fillStyle = random() < .5 ? '#252f2470' : '#d9cc9759';
      context.fillRect(x, y, .45 + random() * 2.15, .4 + random() * 1.35);
    }
  });
}

function addSky(scene) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color('#627977') },
      haze: { value: new THREE.Color('#b5bb9c') },
      light: { value: new THREE.Color('#ffdf9d') },
      sunDirection: { value: new THREE.Vector3(.48, .19, -.86).normalize() },
    },
    vertexShader: `
      varying vec3 skyDirection;
      void main() {
        skyDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 skyDirection;
      uniform vec3 zenith;
      uniform vec3 haze;
      uniform vec3 light;
      uniform vec3 sunDirection;
      void main() {
        vec3 ray = normalize(skyDirection);
        float elevation = max(ray.y, 0.0);
        vec3 color = mix(haze, zenith, smoothstep(0.01, 0.72, elevation));
        float sun = max(dot(ray, sunDirection), 0.0);
        color = mix(color, light, 0.58 * pow(sun, 13.0) + 0.22 * pow(sun, 92.0));
        color = mix(color, vec3(1.0, 0.91, 0.67), smoothstep(0.99946, 0.99975, sun));
        float band = sin(ray.y * 36.0 + sin(ray.x * 9.0) * 1.6)
          * cos(ray.x * 15.0 + ray.z * 10.0);
        float cloud = smoothstep(0.57, 0.98, band) * smoothstep(0.08, 0.23, elevation)
          * (1.0 - smoothstep(0.28, 0.68, elevation));
        color = mix(color, haze, cloud * 0.24);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(185, 36, 20), material);
  sky.renderOrder = -10;
  scene.add(sky);
}

function addRidges(scene) {
  const random = randomSource(196);
  const colors = [0x4e645b, 0x65786c, 0x7d8a77];
  const ridges = [
    { x: -13, z: -102, width: 185, height: 25, color: colors[2] },
    { x: -20, z: -78, width: 157, height: 20, color: colors[1] },
    { x: -52, z: -59, width: 96, height: 14, color: colors[0] },
    { x: 57, z: -77, width: 80, height: 15, color: colors[1] },
  ];
  for (const { x, z, width, height, color } of ridges) {
    const ridge = new THREE.Shape();
    ridge.moveTo(x - width / 2, -6);
    for (let i = 0; i <= 26; i++) {
      const peak = Math.sin(i * .61) * .25 + Math.cos(i * .31) * .18 + .25 + random() * .3;
      ridge.lineTo(x + (i / 26 - .5) * width, height * peak);
    }
    ridge.lineTo(x + width / 2, -6);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(ridge), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    mesh.position.z = z;
    scene.add(mesh);
  }
}

function addVegetation(scene) {
  const random = randomSource(5150);
  const treeSpots = [
    [-19, 15, 10], [-15.5, 7, 9], [-19, .2, 11], [18, 16, 12],
    [20, 10, 9], [22, .3, 13], [-18, -14, 12], [-15.9, -18, 10],
  ];
  for (let i = 0; i < 230; i++) {
    const x = (random() - .5) * 135;
    const z = random() * 115 - 87;
    if (x > -21 && x < 23 && z > -28 && z < 24) continue;
    treeSpots.push([x, z, 5.5 + random() * 9]);
  }

  const bark = new THREE.MeshStandardMaterial({ color: 0xa4957b, flatShading: true });
  const needles = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.08, .2, 1, 5), bark, treeSpots.length);
  const tops = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), needles, treeSpots.length * 4);
  trunks.castShadow = true;
  tops.castShadow = true;
  const dummy = new THREE.Object3D();

  treeSpots.forEach(([x, z, height], index) => {
    const yaw = random() * Math.PI;
    dummy.position.set(x, height * .34, z);
    dummy.rotation.set(0, yaw, .05 * (random() - .5));
    dummy.scale.set(height * .18, height * .71, height * .18);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
    for (let tier = 0; tier < 4; tier++) {
      const spread = height * (.23 - tier * .039) * (.85 + random() * .25);
      const length = height * (.39 - tier * .042);
      dummy.position.set(x + tier * .033, height * (.36 + tier * .16), z);
      dummy.rotation.y = yaw + tier * .3;
      dummy.scale.set(spread, length, spread);
      dummy.updateMatrix();
      const instance = index * 4 + tier;
      tops.setMatrixAt(instance, dummy.matrix);
      const color = new THREE.Color('#385446').lerp(new THREE.Color('#71825a'), random() * .52 + tier * .065);
      tops.setColorAt(instance, color);
    }
  });
  scene.add(trunks, tops);

  const tuft = new THREE.BufferGeometry();
  tuft.setAttribute('position', new THREE.Float32BufferAttribute([
    -.13, 0, 0, .03, 0, 0, -.16, .32, -.04,
    -.04, 0, .025, .07, 0, .025, .11, .41, -.018,
    0, 0, -.075, .035, 0, .09, .065, .29, .17,
  ], 3));
  tuft.computeVertexNormals();
  const grass = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1, side: THREE.DoubleSide,
  }), 1450);
  let planted = 0;
  while (planted < grass.count) {
    const x = random() * 57 - 29;
    const z = random() * 60 - 34;
    if ((z > -11 && Math.abs(x - 1.5) < 4.8) || (z < -3 && z > -27 && x > 5 && x < 19) ||
        (z < -10 && z > -24 && x > -12 && x < -5)) continue;
    const scale = .56 + random() * .92;
    dummy.position.set(x, -.025, z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    grass.setMatrixAt(planted, dummy.matrix);
    grass.setColorAt(planted++, new THREE.Color('#4d6440').lerp(new THREE.Color('#aa9b5c'), random()));
  }
  grass.receiveShadow = true;
  scene.add(grass);

  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeometry, new THREE.MeshStandardMaterial({
    color: 0xffffff, flatShading: true, roughness: 1,
  }), 92);
  for (let i = 0; i < rocks.count; i++) {
    const side = random() < .5 ? -1 : 1;
    const x = side * (5 + random() * 24);
    const z = random() * 62 - 34;
    const size = random() < .08 ? .75 + random() * .9 : .08 + random() * .25;
    dummy.position.set(x, size * .18 - .01, z);
    dummy.rotation.set(0, random() * 6.28, random());
    dummy.scale.set(size, size * .54, size * .71);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(i, new THREE.Color('#414d44').lerp(new THREE.Color('#8f8e75'), random()));
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);
}

export function addLandscape(scene) {
  addSky(scene);
  addRidges(scene);

  const base = new THREE.Mesh(new THREE.PlaneGeometry(325, 325), new THREE.MeshStandardMaterial({
    color: 0x626a4b, roughness: 1,
  }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = -.035;
  scene.add(base);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(116, 116), new THREE.MeshStandardMaterial({
    map: groundTexture(), roughness: 1,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  addVegetation(scene);
}
