const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep, recoveryMode) {
        const room = creep.room;
        const sources = room.find(FIND_SOURCES);

        // --- 1. Sélection d'une source à assigner uniquement si pas encore mémorisée ou disparue ---
        let assignedSource = Game.getObjectById(creep.memory.targetSourceId);
        if (!assignedSource) {
            let availableSources = sources.filter(source =>
                room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER &&
                                 s.pos.getRangeTo(source) <= 1
                }).length > 0
            );
            assignedSource = null;
            for (let source of availableSources) {
                let shNearby = _.find(Game.creeps, c =>
                    c.memory.role === 'superharvester' &&
                    c.memory.targetSourceId === source.id
                );
                if (!shNearby) {
                    assignedSource = source;
                    break;
                }
            }
            if (!assignedSource) {
                for (let source of sources) {
                    let shNearby = _.find(Game.creeps, c =>
                        c.memory.role === 'superharvester' &&
                        c.memory.targetSourceId === source.id
                    );
                    if (!shNearby) {
                        assignedSource = source;
                        break;
                    }
                }
            }
            if (!assignedSource) assignedSource = sources[0];
            creep.memory.targetSourceId = assignedSource.id;
        }

        // --- 2. Recherche du container adjacent à la source ---
        let container = null;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let x = assignedSource.pos.x + dx, y = assignedSource.pos.y + dy;
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                let found = assignedSource.room.lookForAt(LOOK_STRUCTURES, x, y)
                    .find(s => s.structureType === STRUCTURE_CONTAINER);
                if (found) {
                    container = found;
                    break;
                }
            }
            if (container) break;
        }

        // --- 3. Recherche de la meilleure case cible (jamais sur le container !) ---
        let mustReset = false;
        let pos = creep.memory.targetPos;
        if (pos) {
            let hereContainer = creep.pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_CONTAINER);
            let targetContainer = creep.room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).some(s => s.structureType === STRUCTURE_CONTAINER);
            if (hereContainer || targetContainer || creep.pos.getRangeTo(assignedSource) > 1) mustReset = true;
        }
        if (!pos || mustReset) {
            let best = null, minDistCtrl = Infinity;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let x = assignedSource.pos.x + dx, y = assignedSource.pos.y + dy;
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    let hasContainer = assignedSource.room.lookForAt(LOOK_STRUCTURES, x, y)
                        .some(s => s.structureType === STRUCTURE_CONTAINER);
                    if (hasContainer) continue;
                    if (container && container.pos.getRangeTo(x, y) > 1) continue;
                    let terrain = assignedSource.room.lookForAt(LOOK_TERRAIN, x, y)[0];
                    if (terrain !== "plain" && terrain !== "swamp") continue;
                    let distCtrl = assignedSource.room.controller ? Math.max(
                        Math.abs(assignedSource.room.controller.pos.x - x),
                        Math.abs(assignedSource.room.controller.pos.y - y)
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

        // --- 4. Aller sur la case idéale si besoin ---
        if (pos && (creep.pos.x !== pos.x || creep.pos.y !== pos.y)) {
            creep.moveTo(new RoomPosition(pos.x, pos.y, pos.roomName), {visualizePathStyle: {stroke: '#00ff00'}});
            return;
        }

        // --- 5. Miner (toujours à portée 1 ici) ---
        if (creep.pos.getRangeTo(assignedSource) == 1) {
            creep.harvest(assignedSource);
        }

        // --- 6. Déposer dans n'importe quel container à portée 1 ---
        if (creep.store[RESOURCE_ENERGY] > 0) {
            let containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (containers.length > 0) {
                creep.transfer(containers[0], RESOURCE_ENERGY);
            } else {
                goToParking(creep, {role: 'superharvester'});
            }
        }
    }
};
