// module.plan_base.js

const utils = require('module.utils');

const donutLayout = [
    { dx: 0, dy: 0, type: STRUCTURE_SPAWN },
    { dx: -1, dy: -1, type: STRUCTURE_EXTENSION },
    { dx: 0, dy: -1, type: STRUCTURE_EXTENSION },
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

        // Layout autour du spawn
        for (const part of donutLayout) {
            const x = spawn.pos.x + part.dx;
            const y = spawn.pos.y + part.dy;
            if (x > 1 && x < 48 && y > 1 && y < 48) {
                plan.push({ x, y, type: part.type });
                if (part.type !== STRUCTURE_ROAD) {
                    plan.push({ x, y, type: STRUCTURE_RAMPART });
                }
            }
        }

        // Containers à portée des sources
        for (const source of sources) {
            const nearby = utils.getEmptySpotsAround(source.pos, 1);
            if (nearby.length > 0) {
                const pos = nearby[0];
                plan.push({ x: pos.x, y: pos.y, type: STRUCTURE_CONTAINER });
            }
        }

        // Container au contrôleur
        if (controller) {
            const near = utils.getEmptySpotsAround(controller.pos, 1)[0];
            if (near) {
                plan.push({ x: near.x, y: near.y, type: STRUCTURE_CONTAINER });
            }
        }

        // Tower à côté du spawn
        const tx = spawn.pos.x + 3;
        const ty = spawn.pos.y;
        if (tx < 48) {
            plan.push({ x: tx, y: ty, type: STRUCTURE_TOWER });
            plan.push({ x: tx, y: ty, type: STRUCTURE_RAMPART });
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

        Memory.plan = Memory.plan || {};
        Memory.plan[room.name] = plan;
        console.log(`✅ Planification terminée pour ${room.name} avec ${plan.length} éléments.`);
    }
};
