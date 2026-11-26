# Game design

## Approved direction

Lost Survivor is an exploration-oriented survival prototype. Interactions should feel responsive and grounded. First-person equipment and interactions use invisible hands. Third-person support shares the same character and movement state. The current art direction is a stylized, low-poly forest yard with muted greens, warm light, distant trees, and industrial structures. Dark fantasy and horror atmosphere was requested for door interactions, but a complete setting or narrative has not been approved.

## Implemented playtest

The player explores the relay yard and activates three marked relays. A completion message appears when all are online. The yard contains a workshop, storehouse, shelter, lookout stairs, obstacles, trees, fencing, and utility poles.

WASD moves, Shift sprints, Space jumps, and V changes camera. First person uses mouse look and a handless viewmodel. Third person orbits behind the character and turns the body toward movement. The built-in character is a procedural survivor with a procedural gait, plus optional imported glTF models.

The Glock has firing feedback, ammunition, recoil, aim, reload, and inspect animations. Slot 1 holsters it and slot 2 equips it. The current implementation has no targets, enemies, damage, or projectile hit system. Firing is presentation and ammunition handling.

E activates relays or toggles a door. Doors swing with simulated angular motion, handles, latches, collision, and limited pushing. A second E press closes an open door. The user explicitly requested a single press, so hold-and-drag interaction is not part of the current design.

The HUD shows objectives, markers, equipment, contextual prompts, heading, and a toggleable debug panel. The Glock uses synthesized audio. Door audio exposes events for future positional sounds, with no sound assets configured.

## Animation and future ideas

Use clear, responsive motion that respects collision and avoids excessive camera shake. Height changes are visually eased while the normal gait remains in use on stairs. More realistic characters, richer survival mechanics, enemy encounters, damage, and door sound assets are possible future ideas, not approved requirements or implemented features. Seek the user's direction before treating them as a roadmap.
