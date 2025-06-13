const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep, recoveryMode) {
        if (recoveryMode) {
            goToParking(creep, {role: 'repairer'});
            return;
        }

        // PHASE : SWITCH REPARATION/RECHARGE
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.repairing = false;
            creep.memory.repairTargetId = undefined;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.repairing = true;
        }

        // --- PHASE REPARATION ---
        if (creep.memory.repairing) {
            const initialThreshold = 10000;
            const repairThreshold = 5000;

            // Initialisation : tant qu'un rempart/mur < 10k, on est en phase initiale
            if (!Memory.wallsInitialized) {
                let lowest = creep.room.find(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL)
                }).sort((a, b) => a.hits - b.hits)[0];
                if (lowest && lowest.hits >= initialThreshold) {
                    Memory.wallsInitialized = true;
                }
            }

            // Recherche de la cible à réparer
            if (!creep.memory.repairTargetId) {
                let newTarget;
                if (!Memory.wallsInitialized) {
                    // Phase initiale : tout à 10k
                    newTarget = creep.room.find(FIND_STRUCTURES, {
                        filter: s =>
                            (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                            s.hits < initialThreshold
                    }).sort((a, b) => a.hits - b.hits)[0];
                } else {
                    // Routine : remonte ramparts/walls à 5k, puis monte à 10k
                    newTarget = creep.room.find(FIND_STRUCTURES, {
                        filter: s =>
                            (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                            s.hits < repairThreshold
                    }).sort((a, b) => a.hits - b.hits)[0];
                }
                if (newTarget) {
                    creep.memory.repairTargetId = newTarget.id;
                }
            }

            let target = creep.memory.repairTargetId ? Game.getObjectById(creep.memory.repairTargetId) : null;

            // --- PATCH ANTI-OSCILLATION : rien à réparer, park même plein ---
            if (!target) {
                creep.memory.repairing = false; // Reset state pour sortir de la boucle inutile
                creep.memory.repairTargetId = undefined;
                goToParking(creep, {role: 'repairer'});
                return;
            }

            // Si la cible est réparée/morte, reset
            if (
                (target.structureType === STRUCTURE_RAMPART || target.structureType === STRUCTURE_WALL) &&
                target.hits >= initialThreshold
            ) {
                creep.memory.repairTargetId = undefined;
                // Vérifie s'il reste d'autres cibles, sinon park
                let other = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                        s.hits < initialThreshold
                })[0];
                if (!other) {
                    creep.memory.repairing = false;
                    goToParking(creep, {role: 'repairer'});
                    return;
                }
            }

            // Réparation active
            if (target && (target.structureType === STRUCTURE_RAMPART || target.structureType === STRUCTURE_WALL)) {
                if (target.hits < initialThreshold) {
                    if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
                    }
                    return;
                }
            }

            // Autres cibles (routes, containers, etc.)
            if (!target || target.hits >= initialThreshold) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
                });
                creep.memory.repairTargetId = target ? target.id : undefined;
            }

            if (target && target.hits < target.hitsMax) {
                if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
                }
                return;
            }

            // Si vraiment rien à faire, park (anti-oscillation)
            if (!target) {
                creep.memory.repairing = false;
                goToParking(creep, {role: 'repairer'});
                return;
            }
        }

        // --- PHASE RECHARGE ---
        // Si plein et pas de cible à réparer, park !
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && !creep.memory.repairTargetId) {
            goToParking(creep, {role: 'repairer'});
            return;
        }

        // Routine recharge
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
        });
        let storageTargets = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
        });
        let spawnsExtensions = [];
        if (!recoveryMode) {
            spawnsExtensions = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_SPAWN) &&
                    s.store[RESOURCE_ENERGY] > 0
            });
        }
        let scored = [];
        containers.forEach(container => {
            let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == container.id);
            scored.push({
                target: container,
                score: container.store[RESOURCE_ENERGY] - assigned * 50
            });
        });
        storageTargets.forEach(storage => {
            let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == storage.id);
            scored.push({
                target: storage,
                score: storage.store[RESOURCE_ENERGY] - assigned * 50
            });
        });
        spawnsExtensions.forEach(sx => {
            let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == sx.id);
            scored.push({
                target: sx,
                score: (sx.store ? sx.store[RESOURCE_ENERGY] : 0) - assigned * 50
            });
        });
        if (scored.length > 0) {
            scored.sort((a, b) => b.score - a.score);
            if (scored[0].score > 0) {
                creep.memory.energyTargetId = scored[0].target.id;
            }
        }
        let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;
        if (
            (!(!recoveryMode) && target && (target.structureType === STRUCTURE_SPAWN || target.structureType === STRUCTURE_EXTENSION))
        ) {
            creep.memory.energyTargetId = undefined;
            target = null;
        }
        if (!target || (target.store && target.store[RESOURCE_ENERGY] === 0)) {
            creep.memory.energyTargetId = undefined;
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            goToParking(creep, {role: 'repairer'});
            return;
        }
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
};
