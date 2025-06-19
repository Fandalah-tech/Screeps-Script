// module.plan_base.js

const utils = require('module.utils');

const donutLayout = [
    { dx: 0, dy: 0, type: STRUCTURE_SPAWN },
    { dx: -1, dy: -1, type: STRUCTURE_EXTENSION },
    { dx: 0, dy: -3, type: STRUCTURE_EXTENSION },
    { dx: 1, dy: -1, type: STRUCTURE_EXTENSION },
    { dx: -1, dy: 0, type: STRUCTURE_EXTENSION },
    { dx: 1, dy: 0, type: STRUCTURE_EXTENSION },
    { dx: -1, dy: 1, type: STRUCTURE_EXTENSION },
    { dx: 0, dy: 1, type: STRUCTURE_EXTENSION },
    { dx: 1, dy: 1, type: STRUCTURE_EXTENSION },
    { dx: 0, dy: -2, type: STRUCTURE_EXTENSION },
    { dx: -2, dy: 0, type: STRUCTURE_EXTENSION },
    { dx: 2, dy: 0, type: STRUCTURE_EXTENSION },
    { dx: 0, dy: 2, type: STRUCTURE_EXTENSION },
    { dx: -1, dy: -2, type: STRUCTURE_ROAD },
    { dx: 1, dy: -2, type: STRUCTURE_ROAD },
    { dx: -2, dy: -1, type: STRUCTURE_ROAD },
    { dx: 2, dy: -1, type: STRUCTURE_ROAD },
    { dx: -2, dy: 1, type: STRUCTURE_ROAD },
    { dx: 2, dy: 1, type: STRUCTURE_ROAD },
    { dx: -1, dy: 2, type: STRUCTURE_ROAD },
    { dx: 1, dy: 2, type: STRUCTURE_ROAD }
];

module.exports = {
    plan(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return console.log("❌ Aucun spawn trouvé pour planifier la base.");

        const sources = room.find(FIND_SOURCES);
        const controller = room.controller;
        const plan = [];

        // Layout autour du spawn (seulement le donut)
        for (const part of donutLayout) {
            const x = spawn.pos.x + part.dx;
            const y = spawn.pos.y + part.dy;
            if (x > 1 && x < 48 && y > 1 && y < 48) {
                plan.push({ x, y, type: part.type });
            }
        }

        // Containers et mining slot SH optimisés à portée des sources
        for (const source of sources) {
            const { shSpot, containerSpot } = utils.getSuperHarvesterSpotAndContainer(source, spawn, room);
            if (shSpot) {
                // Optionnel: plan.push({ x: shSpot.x, y: shSpot.y, type: 'SH_SPOT' }); // pour debug
            }
            if (containerSpot) {
                plan.push({ x: containerSpot.x, y: containerSpot.y, type: STRUCTURE_CONTAINER });
            }
        }

        // Container au contrôleur
        if (controller) {
            const alreadyPlanned = plan.find(p =>
                p.type === STRUCTURE_CONTAINER &&
                Math.abs(p.x - controller.pos.x) <= 1 &&
                Math.abs(p.y - controller.pos.y) <= 1
            );
        
            const existingContainer = controller.pos.findInRange(FIND_STRUCTURES, 1).find(
                s => s.structureType === STRUCTURE_CONTAINER
            );
        
            if (!alreadyPlanned && !existingContainer) {
                const near = utils.getEmptySpotsAround(controller.pos, 1)[0];
                if (near) {
                    plan.push({ x: near.x, y: near.y, type: STRUCTURE_CONTAINER });
                    plan.push({ x: near.x, y: near.y, type: STRUCTURE_RAMPART });
                }
            } else if (existingContainer) {
                plan.push({ x: existingContainer.pos.x, y: existingContainer.pos.y, type: STRUCTURE_RAMPART });
            }
        }

        // Tower à côté du spawn (plus de rampart auto ici)
        const tx = spawn.pos.x + 3;
        const ty = spawn.pos.y;
        if (tx < 48) {
            plan.push({ x: tx, y: ty, type: STRUCTURE_TOWER });
        }

        // Routes spawn <-> controller et spawn <-> sources
        if (controller) {
            const path = room.findPath(spawn.pos, controller.pos, { ignoreCreeps: true });
            for (const step of path) {
                plan.push({ x: step.x, y: step.y, type: STRUCTURE_ROAD });
            }
        }
        for (const source of sources) {
            const path = room.findPath(spawn.pos, source.pos, { ignoreCreeps: true });
            for (const step of path) {
                plan.push({ x: step.x, y: step.y, type: STRUCTURE_ROAD });
            }
        }
        
        // Storage au sud du spawn, 4 cases plus bas
        const sx = spawn.pos.x;
        const sy = spawn.pos.y + 4;
        if (sy < 48) {
            plan.push({ x: sx, y: sy, type: STRUCTURE_STORAGE });
        }

        // --- AJOUT DES RAMPARTS UNIQUEMENT SUR CONTAINERS, STORAGE, SPAWN ---
        // On boucle sur les éléments du plan et on ajoute un rampart uniquement sur les bons types
        const protectedTypes = [STRUCTURE_CONTAINER, STRUCTURE_SPAWN, STRUCTURE_STORAGE];
        for (const s of [...plan]) {
            if (protectedTypes.includes(s.type)) {
                const alreadyRampart = plan.find(p =>
                    p.x === s.x && p.y === s.y && p.type === STRUCTURE_RAMPART
                );
                if (!alreadyRampart) {
                    plan.push({ x: s.x, y: s.y, type: STRUCTURE_RAMPART });
                }
            }
        }

        Memory.plan = Memory.plan || {};
        Memory.plan[room.name] = plan;
        // console.log(`✅ Planification terminée pour ${room.name} avec ${plan.length} éléments.`);
    },
    
    getOrthogonalFreeSpacesAround(pos, room) {
        const dirs = [
            { dx:  0, dy: -1 }, // N
            { dx:  1, dy:  0 }, // E
            { dx:  0, dy:  1 }, // S
            { dx: -1, dy:  0 }  // O
        ];
        const spots = [];
        for (const {dx, dy} of dirs) {
            const x = pos.x + dx;
            const y = pos.y + dy;
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            if (room.lookForAt(LOOK_TERRAIN, x, y)[0] === 'wall') continue;
            spots.push({ x, y, dx, dy });
        }
        return spots;
    }
};
