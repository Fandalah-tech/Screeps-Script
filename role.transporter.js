const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep, recoveryMode) {
        // --- Tower emergency logic ---
        let towers = creep.room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        let emptyTower = towers.find(t => t.store[RESOURCE_ENERGY] === 0);

        if (emptyTower) {
            if (!Memory.towerEmergency || !Game.creeps[Memory.towerEmergency] || Game.creeps[Memory.towerEmergency].spawning) {
                let candidates = _.filter(Game.creeps, c => c.memory.role === 'transporter' && !c.spawning);
                let best = null;
                let minDist = Infinity;
                for (let c of candidates) {
                    let dist = c.pos.getRangeTo(emptyTower.pos);
                    if (dist < minDist) { best = c; minDist = dist; }
                }
                if (best) {
                    Memory.towerEmergency = best.name;
                }
            }
        } else {
            Memory.towerEmergency = undefined;
        }

        let isTowerDuty = (Memory.towerEmergency === creep.name);

        // --- Etat simple : "remplir" ou "vider" ---
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.memory.energyTargetId = undefined; // reset cible
        }
        if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.working = true;
        }

        // --- PHASE RECHARGE (withdraw) ---
        if (!creep.memory.working) {
            if (!creep.memory.energyTargetId) {
                let containers = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_CONTAINER &&
                        s.store[RESOURCE_ENERGY] > 0
                });
                let storages = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_STORAGE &&
                        s.store[RESOURCE_ENERGY] > 0
                });

                let scored = [];
                containers.forEach(container => {
                    let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == container.id);
                    scored.push({
                        target: container,
                        score: container.store[RESOURCE_ENERGY] - assigned * 50
                    });
                });
                storages.forEach(storage => {
                    let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == storage.id);
                    scored.push({
                        target: storage,
                        score: storage.store[RESOURCE_ENERGY] - assigned * 50
                    });
                });

                if (scored.length > 0) {
                    scored.sort((a, b) => b.score - a.score);
                    if (scored[0].score > 0) {
                        creep.memory.energyTargetId = scored[0].target.id;
                    }
                }
            }

            let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;

            if (!target || (target.store && target.store[RESOURCE_ENERGY] === 0)) {
                creep.memory.energyTargetId = undefined;
                let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: res => res.resourceType === RESOURCE_ENERGY
                });
                if (dropped.length > 0) {
                    if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                    return;
                }
                let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if (source) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(source, {visualizePathStyle: {stroke: '#aaffaa'}});
                    }
                }
                return;
            }

            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        // --- PHASE DELIVERY (dépôt structures prioritaires) ---
        else {
            // 1. Mission tower en priorité absolue
            if (isTowerDuty && emptyTower && emptyTower.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                if (creep.transfer(emptyTower, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(emptyTower, {visualizePathStyle: {stroke: '#ff0000'}});
                }
                return;
            }

            // 2. Spawn/extensions non pleins
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    ((s.structureType === STRUCTURE_SPAWN ||
                      s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            });
            if (targets.length > 0) {
                if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }
            // 3. Towers non pleines (si non mission emergency)
            let towersToFill = creep.room.find(FIND_MY_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_TOWER &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (towersToFill.length > 0) {
                towersToFill.sort((a, b) => a.store[RESOURCE_ENERGY] - b.store[RESOURCE_ENERGY]);
                if (creep.transfer(towersToFill[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(towersToFill[0], {visualizePathStyle: {stroke: '#aaffaa'}});
                }
                return;
            }
            // 4. Storage si tout le reste est plein
            let storages = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_STORAGE &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (storages.length > 0) {
                if (creep.transfer(storages[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(storages[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }
            // --- Parking si tout est plein ---
            goToParking(creep, {role: 'transporter'});
            return;
        }
    }
};
