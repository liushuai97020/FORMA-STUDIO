import * as THREE from 'three';
import { HOTSPOTS, ROOMS } from '../state.js';

export function createHotspots(container, { onSelect }) {
  const buttons = new Map();
  const positions = new Map();
  let mode = 'exterior';
  let activeId = null;

  for (const id of HOTSPOTS) {
    const room = ROOMS[id];
    if (!room) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hotspot hotspot--${['living', 'tea', 'bedroom'].includes(id) ? 'interior' : 'exterior'}`;
    button.dataset.room = id;
    button.setAttribute('aria-label', `探索${room.title}，${room.en}`);
    button.innerHTML = `
      <span class="hotspot-dot" aria-hidden="true"></span>
      <span class="hotspot-label">
        <strong>${room.hotspotLabel}</strong>
        <em>${room.hotspotEn}</em>
      </span>
    `;
    button.addEventListener('click', () => onSelect(id));
    container.appendChild(button);
    buttons.set(id, button);
    positions.set(id, new THREE.Vector3(...room.position));
  }

  const viewDirection = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const delta = new THREE.Vector3();

  function setMode(nextMode) {
    mode = nextMode;
  }

  function setActive(id) {
    activeId = id;
    for (const [key, button] of buttons) {
      button.classList.toggle('is-active', key === id);
    }
  }

  function update(camera, width, height) {
    camera.getWorldDirection(viewDirection);
    for (const [id, button] of buttons) {
      const isInterior = ['living', 'tea', 'bedroom'].includes(id);
      const allowed = mode === 'interior' ? isInterior : !isInterior;
      if (!allowed) {
        button.classList.remove('is-visible');
        continue;
      }
      const position = positions.get(id);
      delta.copy(position).sub(camera.position);
      if (delta.dot(viewDirection) <= 0.25) {
        button.classList.remove('is-visible');
        continue;
      }
      projected.copy(position).project(camera);
      if (projected.z < -1 || projected.z > 1) {
        button.classList.remove('is-visible');
        continue;
      }
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) {
        button.classList.remove('is-visible');
        continue;
      }
      button.style.left = `${x.toFixed(2)}px`;
      button.style.top = `${y.toFixed(2)}px`;
      button.classList.add('is-visible');
      button.classList.toggle('is-active', activeId === id);
    }
  }

  return {
    update,
    setMode,
    setActive,
    buttons
  };
}
