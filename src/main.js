import * as THREE from 'three';
import { DebugPanel } from './debug-panel.js';
import { Inventory } from './inventory.js';
import { loadModels } from './models.js';
import { FirstPersonCamera, Player } from './player.js';
import { THIRD_PERSON_MAX_PITCH, THIRD_PERSON_MIN_PITCH, ThirdPersonCamera } from './third-person-camera.js';
import { createWorld } from './world.js';

const element = (id) => document.getElementById(id);
const canvas = element('view');
const menu = element('menu');
const hud = element('hud');
const play = element('play');
const restart = element('restart');
const startupError = element('startup-error');

const SLOT_KEYS = new Map([['Digit1', 1], ['Digit2', 2]]);
const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space', 'KeyE',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyF', 'KeyR', 'KeyV', 'F2',
  ...SLOT_KEYS.keys(),
]);
const FIXED_STEP = 1 / 120;
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function createRelayUI(relays) {
  return relays.map((relay) => {
    const row = document.createElement('li');
    row.className = 'objective';
    const icon = document.createElement('span');
    icon.className = 'relay-state';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = relay.label;
    const status = document.createElement('span');
    status.className = 'objective-status';
    row.append(icon, label, status);
    element('objective-list').append(row);

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.hidden = true;
    element('markers').append(marker);
    return { relay, row, status, marker };
  });
}

function runGame(renderer) {
  const world = createWorld();
  const player = new Player(world.spawn);
  world.scene.add(player.root);

  const view = new FirstPersonCamera(1);
  const thirdPerson = new ThirdPersonCamera(1);
  let gameplayCamera = view.camera;
  const inventory = new Inventory(view.reducedMotion);
  const debugPanel = new DebugPanel(element('debug-panel'));
  const menuCamera = new THREE.PerspectiveCamera(55, 1, .05, 215);
  menuCamera.position.set(-11.4, 4.6, 19.1);
  menuCamera.lookAt(5.6, 2.3, -11);

  const relayUI = createRelayUI(world.relays);
  const keys = new Set();
  const input = { side: 0, forward: 0, yaw: world.spawn.yaw, sprint: false, jump: false };
  const aim = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const lineOfSight = new THREE.Ray();
  const viewDirection = new THREE.Vector3();
  const viewRight = new THREE.Vector3();
  const viewDown = new THREE.Vector3();
  const viewOrigin = new THREE.Vector3();
  const viewRay = new THREE.Ray();
  const obstructionHit = new THREE.Vector3();
  const viewmodelRayOffsets = [[0, 0], [.25, -.14], [.44, -.30]];

  let mode = 'menu';
  let pitch = -.035;
  let locked = false;
  let fireHeld = false;
  let aiming = false;
  let dragPointer = null;
  let jumpQueued = false;
  let notificationUntil = 0;
  let accumulator = 0;
  let previousTime = performance.now();
  let needsRender = true;

  const prompt = element('prompt');
  const promptLabel = element('prompt-label');
  const reticle = element('reticle');
  const notification = element('notification');
  const bearing = element('bearing');
  const compassLeft = element('compass-left');
  const compassRight = element('compass-right');
  const cameraMode = element('camera-mode');
  const freeLookHint = element('free-look-hint');
  const pistolAmmo = element('pistol-ammo');
  const pistolCounter = element('pistol-counter');
  const equipmentStatus = element('equipment-status');
  const slotRows = [...element('inventory-slots').children];
  element('pistol-capacity').textContent = `/ ${inventory.pistol.capacity}`;

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    const aspect = width / Math.max(1, height);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.setSize(width, height, false);
    for (const camera of [view.camera, thirdPerson.camera, menuCamera]) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    inventory.resize(aspect);
    needsRender = true;
  }

  function updateEquipmentStatus() {
    const { pistol, action, isPistol } = inventory;
    const ammo = String(pistol.ammo).padStart(2, '0');
    const status = action === 'reload' ? 'Reloading' :
      action === 'inspect' ? 'Inspecting' : isPistol && pistol.ammo === 0 ? 'Empty · R to reload' : '';
    if (pistolAmmo.textContent !== ammo) pistolAmmo.textContent = ammo;
    if (equipmentStatus.textContent !== status) equipmentStatus.textContent = status;
  }

  function showEquippedItem() {
    player.setHeldItem(inventory.heldItem);
    for (const row of slotRows) {
      if (Number(row.dataset.slot) === inventory.slot) {
        row.setAttribute('aria-current', 'true');
      } else {
        row.removeAttribute('aria-current');
      }
    }
    pistolCounter.hidden = !inventory.isPistol;
    updateEquipmentStatus();
  }

  function updateObjectives() {
    const total = world.relays.filter((relay) => relay.active).length;
    const restored = total === world.relays.length;
    element('relay-count').textContent = `${total} / ${world.relays.length}`;
    element('objective-title').textContent = restored ? 'Signal restored' : 'Restore the signal';
    const menuSignal = element('menu-signal');
    menuSignal.textContent = restored ? 'Signal restored' : total ? `${total} of 3 online` : 'Signal lost';
    menuSignal.parentElement.classList.toggle('online', restored);
    for (const { relay, row, status } of relayUI) {
      row.classList.toggle('online', relay.active);
      status.textContent = relay.active ? 'Online' : 'Offline';
    }
    return restored;
  }

  function reset() {
    player.reset();
    inventory.reset();
    showEquippedItem();
    input.yaw = player.yaw;
    pitch = -.035;
    view.reset(player, pitch);
    thirdPerson.update(player, input.yaw, pitch, world.solids, 0, true);
    for (const relay of world.relays) relay.setActive(false);
    updateObjectives();
    notification.textContent = '';
    notificationUntil = 0;
    prompt.hidden = true;
    reticle.classList.remove('ready');
  }

  function updateCapture() {
    freeLookHint.hidden = locked || mode !== 'playing';
  }

  function pause() {
    if (mode !== 'playing') return;
    mode = 'paused';
    fireHeld = false;
    aiming = false;
    keys.clear();
    jumpQueued = false;
    dragPointer = null;
    accumulator = 0;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    menu.hidden = false;
    hud.hidden = true;
    restart.hidden = false;
    element('play-label').textContent = 'Resume playtest';
    element('menu-description').textContent = 'Playtest paused.';
    play.focus();
  }

  function begin() {
    mode = 'playing';
    debugPanel.resetTiming();
    inventory.pistol.audio.unlock();
    menu.hidden = true;
    hud.hidden = false;
    document.activeElement?.blur();
    updateCapture();
    try {
      const request = canvas.requestPointerLock?.();
      request?.catch(updateCapture);
    } catch {
      updateCapture();
    }
  }

  function look(horizontal, vertical) {
    input.yaw = THREE.MathUtils.euclideanModulo(input.yaw - horizontal + Math.PI, 2 * Math.PI) - Math.PI;
    if (gameplayCamera === view.camera) inventory.addLook(horizontal, vertical);
    const orbiting = gameplayCamera === thirdPerson.camera;
    pitch = THREE.MathUtils.clamp(pitch - vertical,
      orbiting ? THIRD_PERSON_MIN_PITCH : -1.43, orbiting ? THIRD_PERSON_MAX_PITCH : 1.43);
  }

  function toggleCamera() {
    if (gameplayCamera === view.camera) {
      pitch = THREE.MathUtils.clamp(pitch, THIRD_PERSON_MIN_PITCH, THIRD_PERSON_MAX_PITCH);
      thirdPerson.update(player, input.yaw, pitch, world.solids, 0, true);
      gameplayCamera = thirdPerson.camera;
      cameraMode.textContent = 'Third person';
      reticle.hidden = true;
    } else {
      gameplayCamera = view.camera;
      cameraMode.textContent = 'First person';
      reticle.hidden = false;
    }
  }

  function nearestViewObstruction() {
    view.camera.getWorldDirection(viewDirection);
    viewRight.set(1, 0, 0).applyQuaternion(view.camera.quaternion);
    viewDown.set(0, -1, 0).applyQuaternion(view.camera.quaternion);
    let nearest = Infinity;
    for (const [right, down] of viewmodelRayOffsets) {
      viewOrigin.copy(view.camera.position)
        .addScaledVector(viewRight, right)
        .addScaledVector(viewDown, down);
      viewRay.set(viewOrigin, viewDirection);
      for (const solid of world.solids) {
        const intersection = viewRay.intersectBox(solid, obstructionHit);
        if (intersection) nearest = Math.min(nearest, viewOrigin.distanceTo(intersection));
      }
    }
    return nearest;
  }

  function nearbyRelay() {
    view.camera.getWorldDirection(aim);
    const eye = view.camera.position;
    let nearest;
    let nearestDistance = 2.55;
    for (const relay of world.relays) {
      if (relay.active || Math.abs(player.position.y + 1.18 - relay.panel.y) > .72 ||
          eye.z < relay.panel.z - .04) continue;
      offset.copy(relay.panel).sub(eye);
      const distance = offset.length();
      if (distance >= nearestDistance || offset.normalize().dot(aim) < .71) continue;

      lineOfSight.set(eye, offset);
      const obstructed = world.solids.some((box) => {
        const intersection = lineOfSight.intersectBox(box, hit);
        return intersection && eye.distanceToSquared(intersection) < (distance - .07) ** 2;
      });
      if (obstructed) continue;
      nearest = relay;
      nearestDistance = distance;
    }
    return nearest;
  }

  function activateRelay() {
    const relay = nearbyRelay();
    if (!relay) return;
    relay.setActive(true);
    const restored = updateObjectives();
    notification.textContent = restored ? 'All three relays online. Signal restored.' : `${relay.label} relay online.`;
    notificationUntil = performance.now() + (restored ? 6500 : 3200);
  }

  function updateHUD(now) {
    const yaw = gameplayCamera === thirdPerson.camera ? thirdPerson.yaw : input.yaw;
    const heading = THREE.MathUtils.euclideanModulo(-THREE.MathUtils.radToDeg(yaw), 360);
    const sector = Math.round(heading / 45) % 8;
    const headingText = `${Math.round(heading) % 360}°`;
    if (bearing.textContent !== headingText) bearing.textContent = headingText;
    const left = CARDINALS[(sector + 7) % 8];
    const right = CARDINALS[(sector + 1) % 8];
    if (compassLeft.textContent !== left) compassLeft.textContent = left;
    if (compassRight.textContent !== right) compassRight.textContent = right;

    gameplayCamera.updateMatrixWorld();
    gameplayCamera.getWorldDirection(aim);
    for (const { relay, marker } of relayUI) {
      offset.copy(relay.marker).sub(gameplayCamera.position);
      if (relay.active || offset.dot(aim) <= 0) {
        marker.hidden = true;
        continue;
      }
      projected.copy(relay.marker).project(gameplayCamera);
      marker.hidden = Math.abs(projected.x) > .91 || Math.abs(projected.y) > .83;
      if (!marker.hidden) {
        marker.style.left = `${(projected.x + 1) * 50}%`;
        marker.style.top = `${(1 - projected.y) * 50}%`;
        const distance = Math.round(player.position.distanceTo(relay.panel));
        const text = `${relay.number} · ${distance} m`;
        if (marker.textContent !== text) marker.textContent = text;
      }
    }

    const relay = nearbyRelay();
    prompt.hidden = !relay;
    reticle.classList.toggle('ready', Boolean(relay));
    reticle.classList.toggle('dimmed', Boolean(inventory.action) && !relay);
    if (relay) promptLabel.textContent = `Activate ${relay.label.toLowerCase()} relay`;
    if (notificationUntil && now > notificationUntil) {
      notification.textContent = '';
      notificationUntil = 0;
    }
  }

  function frame(now) {
    const delta = Math.min(Math.max(0, (now - previousTime) / 1000), .075);
    previousTime = now;
    if (mode === 'playing') {
      const orbiting = gameplayCamera === thirdPerson.camera;
      const sideLook = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      const upLook = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
      if (sideLook || upLook) look(sideLook * delta * 1.65, upLook * delta * 1.25);
      input.forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      input.side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');

      accumulator += delta;
      while (accumulator >= FIXED_STEP) {
        input.jump = jumpQueued;
        jumpQueued = false;
        player.step(FIXED_STEP, input, world.solids, orbiting ? thirdPerson.yaw : null);
        accumulator -= FIXED_STEP;
      }
      if (player.position.y < -8) reset();
      if (orbiting) thirdPerson.update(player, input.yaw, pitch, world.solids, delta);
      view.update(player, pitch, delta, orbiting ? thirdPerson.yaw : input.yaw, inventory.pistol.cameraRecoil);
      const obstruction = !orbiting && inventory.isPistol ? nearestViewObstruction() : Infinity;
      inventory.update(delta, player.speed, aiming && !orbiting, obstruction);
      if (fireHeld) inventory.fire();
      updateEquipmentStatus();
      updateHUD(now);
      debugPanel.update(now, player, orbiting);
    }
    if (mode === 'playing' || needsRender) {
      renderer.render(world.scene, mode === 'menu' ? menuCamera : gameplayCamera);
      if (mode !== 'menu' && gameplayCamera === view.camera) {
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(inventory.scene, inventory.camera);
        renderer.autoClear = true;
      }
      needsRender = false;
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  document.addEventListener('pointerlockchange', () => {
    const wasLocked = locked;
    locked = document.pointerLockElement === canvas;
    if (wasLocked && !locked) pause();
    if (locked && mode !== 'playing') document.exitPointerLock();
    updateCapture();
  });
  document.addEventListener('pointerlockerror', updateCapture);
  document.addEventListener('keydown', (event) => {
    if (mode !== 'playing') return;
    if (event.code === 'Escape') {
      pause();
      return;
    }
    if (!GAME_KEYS.has(event.code)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'Space') jumpQueued = true;
    if (event.code === 'KeyE') activateRelay();
    if (event.code === 'KeyR') inventory.reload();
    if (event.code === 'KeyF') inventory.inspect();
    if (event.code === 'KeyV') toggleCamera();
    if (event.code === 'F2') debugPanel.toggle();
    const slot = SLOT_KEYS.get(event.code);
    if (slot && inventory.select(slot)) showEquippedItem();
  });
  document.addEventListener('keyup', (event) => keys.delete(event.code));
  document.addEventListener('mousemove', (event) => {
    if (mode === 'playing' && locked) look(event.movementX * .0023, event.movementY * .0023);
  });
  document.addEventListener('mousedown', (event) => {
    if (mode !== 'playing') return;
    if (event.button === 0 && locked) fireHeld = true;
    if (event.button === 2) aiming = true;
  });
  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) fireHeld = false;
    if (event.button === 2) aiming = false;
  });
  document.addEventListener('contextmenu', (event) => {
    if (mode === 'playing') event.preventDefault();
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (mode !== 'playing' || locked || event.button !== 0) return;
    dragPointer = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (mode !== 'playing' || locked || event.pointerId !== dragPointer?.id) return;
    dragPointer.moved ||= Math.hypot(event.clientX - dragPointer.startX, event.clientY - dragPointer.startY) >= 6;
    look((event.clientX - dragPointer.x) * .004, (event.clientY - dragPointer.y) * .004);
    dragPointer.x = event.clientX;
    dragPointer.y = event.clientY;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (mode === 'playing' && !locked && event.button === 0 && event.pointerType === 'mouse' &&
        event.pointerId === dragPointer?.id && !dragPointer.moved) {
      inventory.fire();
    }
  });
  canvas.addEventListener('lostpointercapture', () => { dragPointer = null; });
  play.addEventListener('click', begin);
  restart.addEventListener('click', () => {
    reset();
    begin();
  });
  element('pause').addEventListener('click', pause);

  reset();
  resize();
  renderer.setAnimationLoop(frame);

  loadModels(player, world).then((failures) => {
    if (failures.length) {
      for (const { reason } of failures) console.warn('Could not load a configured model:', reason);
      startupError.textContent = 'A configured model failed to load. The yard is still playable.';
      startupError.hidden = false;
    }
    renderer.shadowMap.needsUpdate = true;
    needsRender = true;
    play.disabled = false;
    element('play-label').textContent = 'Enter the yard';
  });
}

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  runGame(renderer);
} catch (error) {
  console.error(error);
  startupError.textContent = 'The 3D view could not start. Try a desktop browser with WebGL 2 enabled.';
  startupError.hidden = false;
  element('play-label').textContent = 'Yard unavailable';
}
