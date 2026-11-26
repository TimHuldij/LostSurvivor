import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { models } from '../models/model-config.js';

const loader = new GLTFLoader();
const modelDirectory = new URL('../models/', import.meta.url);

function enableShadows(model) {
  model.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

export async function loadModels(player, world) {
  const jobs = (models.props ?? []).map(async (config) => {
    const { scene } = await loader.loadAsync(new URL(config.file, modelDirectory).href);
    scene.position.set(...(config.position ?? [0, 0, 0]));
    scene.rotation.y = THREE.MathUtils.degToRad(config.yaw ?? 0);
    scene.scale.setScalar(config.scale ?? 1);
    enableShadows(scene);
    world.scene.add(scene);
    if (config.solid) world.solids.push(new THREE.Box3().setFromObject(scene));
  });

  if (models.player) {
    const config = models.player;
    jobs.push((async () => {
      const { scene, animations } = await loader.loadAsync(new URL(config.file, modelDirectory).href);
      // Keep the wrapper transforms separate from nodes targeted by animation clips.
      const orientation = new THREE.Group();
      orientation.rotation.y = THREE.MathUtils.degToRad(config.yaw ?? 0);
      orientation.add(scene);
      const bounds = new THREE.Box3().setFromObject(orientation);
      const height = bounds.max.y - bounds.min.y;
      if (!Number.isFinite(height) || height <= 0) throw new Error('Player model has no measurable height');

      const pivot = new THREE.Group();
      const center = bounds.getCenter(new THREE.Vector3());
      orientation.position.set(-center.x, -bounds.min.y, -center.z);
      pivot.scale.setScalar((config.height ?? 1.76) / height);
      pivot.add(orientation);
      player.setBody(pivot, animations, config.animations);
    })());
  }

  return (await Promise.allSettled(jobs)).filter(({ status }) => status === 'rejected');
}
