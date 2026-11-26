import * as THREE from 'three';
import { roundedPart } from './model-geometry.js';

export function createSurvivorBody() {
  const body = new THREE.Group();
  body.name = 'Relay yard survivor';
  const cloth = new THREE.MeshStandardMaterial({ color: 0x626c46, roughness: .96 });
  const nylon = new THREE.MeshStandardMaterial({ color: 0x3a483c, roughness: .92 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x817552, roughness: .97 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x252c27, roughness: .83 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xbfc880, roughness: .72 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xc79b55, roughness: .33, metalness: .17 });

  roundedPart(body, cloth, [.44, .51, .29], [0, 1.13, 0], .07);
  roundedPart(body, nylon, [.37, .37, .10], [0, 1.16, -.14], .032);
  roundedPart(body, rubber, [.39, .075, .29], [0, .89, 0], .022);
  roundedPart(body, nylon, [.21, .10, .21], [0, 1.39, 0], .038);
  roundedPart(body, rubber, [.30, .30, .29], [0, 1.57, 0], .07);
  roundedPart(body, nylon, [.323, .20, .29], [0, 1.64, .021], .07);
  roundedPart(body, glass, [.251, .094, .063], [0, 1.588, -.13], .026);
  roundedPart(body, canvas, [.34, .39, .16], [0, 1.16, .209], .055);
  roundedPart(body, nylon, [.33, .092, .179], [0, 1.29, .212], .033);

  for (const side of [-1, 1]) {
    roundedPart(body, canvas, [.041, .35, .053], [side * .14, 1.21, -.191], .013);
    roundedPart(body, canvas, [.13, .122, .09], [side * .083, 1.105, -.207], .021);
    roundedPart(body, rubber, [.059, .137, .132], [side * .146, 1.578, .007], .024);
  }
  roundedPart(body, trim, [.10, .035, .012], [-.07, 1.259, -.199], .004);

  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * .111, .869, 0);
    roundedPart(leg, nylon, [.186, .46, .202], [0, -.207, .003], .045);
    roundedPart(leg, nylon, [.158, .32, .171], [0, -.551, .019], .038);
    roundedPart(leg, rubber, [.131, .125, .077], [0, -.40, -.086], .025);
    roundedPart(leg, rubber, [.182, .18, .27], [0, -.756, -.037], .033);
    roundedPart(leg, canvas, [.184, .041, .272], [0, -.84, -.037], .008);
    body.add(leg);

    const arm = new THREE.Group();
    arm.position.set(side * .26, 1.34, 0);
    roundedPart(arm, cloth, [.177, .263, .182], [side * .019, -.113, .007], .055);
    roundedPart(arm, cloth, [.133, .231, .154], [side * .029, -.34, -.049], .039).rotation.x = .29;
    roundedPart(arm, rubber, [.124, .149, .146], [side * .03, -.475, -.088], .034);
    body.add(arm);
    limbs.push({ leg, arm, side });

    if (side === 1) {
      const socket = new THREE.Group();
      socket.name = 'ItemSocket';
      socket.position.set(.020, -.41, -.117);
      socket.rotation.x = -.39;
      arm.add(socket);
    }
  }
  return { body, limbs };
}
