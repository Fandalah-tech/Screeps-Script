module.exports = {
    run: function(creep) {
        // === 1. Assignation unique d'une source ===
        if (!creep.memory.sourceId) {
            let sources = creep.room.find(FIND_SOURCES);
            let assigned = Object.values(Game.creeps)
                .filter(c => c.memory.role === 'superharvester' && c.memory.sourceId && c.name !== creep.name)
                .map(c => c.memory.sourceId);
            let freeSource = sources.find(src => !assigned.includes(src.id));
            creep.memory.sourceId = freeSource ? freeSource.id : (sources[0] && sources[0].id);
        }
        let source = Game.getObjectById(creep.memory.sourceId);
        if (!source) return;

        // === 2. Recherche du container adjacent à la source ===
        let container = null;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let x = source.pos.x + dx, y = source.pos.y + dy;
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                let found = source.room.lookForAt(LOOK_STRUCTURES, x, y)
                    .find(s => s.structureType === STRUCTURE_CONTAINER);
                if (found) {
                    container = found;
                    break;
                }
            }
            if (container) break;
        }

        // === 3. Recherche de la meilleure case cible (jamais sur le container !) ===
        let mustReset = false;
        let pos = creep.memory.targetPos;
        if (pos) {
            // Si le creep est sur un container ou la cible est un container, on reset
            let hereContainer = creep.pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_CONTAINER);
            let targetContainer = creep.room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).some(s => s.structureType === STRUCTURE_CONTAINER);
            // Ou si trop loin de la source
            if (hereContainer || targetContainer || creep.pos.getRangeTo(source) > 1) mustReset = true;
        }
        if (!pos || mustReset) {
            let best = null, minDistCtrl = Infinity;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let x = source.pos.x + dx, y = source.pos.y + dy;
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    // Jamais sur le container !
                    let hasContainer = source.room.lookForAt(LOOK_STRUCTURES, x, y)
                        .some(s => s.structureType === STRUCTURE_CONTAINER);
                    if (hasContainer) continue;
                    // Adjacent au container s'il existe
                    if (container && container.pos.getRangeTo(x, y) > 1) continue;
                    // Terrain praticable
                    let terrain = source.room.lookForAt(LOOK_TERRAIN, x, y)[0];
                    if (terrain !== "plain" && terrain !== "swamp") continue;
                    // Privilégie la case la plus proche du controller
                    let distCtrl = source.room.controller ? Math.max(
                        Math.abs(source.room.controller.pos.x - x),
                        Math.abs(source.room.controller.pos.y - y)
                    ) : 0;
                    if (!best || distCtrl < minDistCtrl) {
                        best = {x, y};
                        minDistCtrl = distCtrl;
                    }
                }
            }
            if (best) {
                creep.memory.targetPos = {x: best.x, y: best.y, roomName: creep.room.name};
                pos = creep.memory.targetPos;
            }
        }

        // === 4. Aller sur la case idéale si besoin ===
        if (pos && (creep.pos.x !== pos.x || creep.pos.y !== pos.y)) {
            creep.moveTo(new RoomPosition(pos.x, pos.y, pos.roomName), {visualizePathStyle: {stroke: '#00ff00'}});
            return;
        }

        // === 5. Miner (toujours à portée 1 ici) ===
        if (creep.pos.getRangeTo(source) == 1) {
            creep.harvest(source);
        }

        // === 6. Déposer dans n'importe quel container à portée 1 ===
        if (creep.store[RESOURCE_ENERGY] > 0) {
            let containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (containers.length > 0) {
                creep.transfer(containers[0], RESOURCE_ENERGY);
            }
        }
    }
};
