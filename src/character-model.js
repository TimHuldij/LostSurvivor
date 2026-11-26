import * as THREE from 'three';
import { roundedPart } from './model-geometry.js';

export const THIGH_LENGTH = .417;
export const SHIN_LENGTH = .391;
export const HIP_HEIGHT = .869;
export const ANKLE_HEIGHT = HIP_HEIGHT - THIGH_LENGTH - SHIN_LENGTH;

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

  const upperBody = new THREE.Group();
  upperBody.position.y = .89;
  for (const part of [...body.children]) {
    part.position.y -= upperBody.position.y;
    upperBody.add(part);
  }
  body.add(upperBody);

  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * .111, HIP_HEIGHT, 0);
    roundedPart(leg, nylon, [.186, .46, .202], [0, -.207, .003], .045);
    const shin = new THREE.Group();
    shin.position.y = -THIGH_LENGTH;
    roundedPart(shin, nylon, [.158, .347, .171], [0, -.153, .011], .038);
    roundedPart(shin, rubber, [.131, .125, .077], [0, .017, -.086], .025);
    const foot = new THREE.Group();
    foot.position.y = -SHIN_LENGTH;
    roundedPart(foot, rubber, [.182, .126, .27], [0, .011, -.039], .026);
    roundedPart(foot, canvas, [.184, .027, .272], [0, -.047, -.039], .008);
    shin.add(foot);
    leg.add(shin);
    body.add(leg);

    const arm = new THREE.Group();
    arm.position.set(side * .26, .45, 0);
    roundedPart(arm, cloth, [.177, .263, .182], [side * .019, -.113, .007], .055);
    const elbow = new THREE.Group();
    elbow.position.set(side * .026, -.233, -.018);
    roundedPart(elbow, cloth, [.133, .231, .154], [0, -.109, -.015], .039);
    roundedPart(elbow, rubber, [.124, .135, .146], [0, -.238, -.022], .034);
    arm.add(elbow);
    upperBody.add(arm);
    limbs.push({ leg, shin, foot, arm, elbow, side });

    if (side === 1) {
      const socket = new THREE.Group();
      socket.name = 'ItemSocket';
      socket.position.set(.005, -.188, -.097);
      socket.rotation.x = -.39;
      elbow.add(socket);
    }
  }
  return { body, limbs, upperBody };
}
