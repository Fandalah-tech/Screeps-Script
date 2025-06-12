module.exports = {
    run: function(creep, recoveryMode) {
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.repairing = true;
        }

        // --- PHASE REPARATION ---
        if (creep.memory.repairing) {
            const initialThreshold = 10000;
            const repairThreshold = 5000;

            // Initialisation: tant qu'un rempart/mur < 10k, on est en phase initiale
            if (!Memory.wallsInitialized) {
                let lowest = creep.room.find(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL)
                }).sort((a, b) => a.hits - b.hits)[0];
                if (lowest && lowest.hits >= initialThreshold) {
                    Memory.wallsInitialized = true;
                }
            }

            // Recherche de la cible
            if (!creep.memory.repairTargetId) {
                let newTarget;
                if (!Memory.wallsInitialized) {
                    // Phase initiale: tout à 10k
                    newTarget = creep.room.find(FIND_STRUCTURES, {
                        filter: s =>
                            (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                            s.hits < initialThreshold
                    }).sort((a, b) => a.hits - b.hits)[0];
                } else {
                    // Routine: répare tout < 5k, et monte à 10k
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

            // Cible courante (peut être un rempart/mur sous 10k)
            let target = creep.memory.repairTargetId ? Game.getObjectById(creep.memory.repairTargetId) : null;

            // --- PATCH CRITIQUE : reset si cible morte ou réparée ---
            if (!target ||
                (target.structureType === STRUCTURE_RAMPART || target.structureType === STRUCTURE_WALL)
                    && target.hits >= initialThreshold
                ||
                (target.structureType !== STRUCTURE_RAMPART && target.structureType !== STRUCTURE_WALL)
                    && target.hits >= target.hitsMax
            ) {
                creep.memory.repairTargetId = undefined;
                return;
            }

            if (target && (target.structureType === STRUCTURE_RAMPART || target.structureType === STRUCTURE_WALL)) {
                if (target.hits < initialThreshold) {
                    // Toujours réparer tant que < 10k
                    if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
                    }
                    return;
                } else {
                    // Arrête de réparer une fois le seuil 10k atteint
                    creep.memory.repairTargetId = undefined;
                }
            }

            // Si toujours rien, cherche une autre structure à réparer (hors mur/rempart)
            if (!target || target.hits >= initialThreshold) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
                });
                creep.memory.repairTargetId = target ? target.id : undefined;
            }

            // Répare ou se déplace vers la cible
            if (target && target.hits < target.hitsMax) {
                if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
                }
            }
            return;
        }

        // --- PHASE RECHARGE REPAIRER (inchangé) ---
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        let totalCapacity = containers.reduce((sum, c) => sum + c.store.getCapacity(RESOURCE_ENERGY), 0);
        let totalStored   = containers.reduce((sum, c) => sum + c.store[RESOURCE_ENERGY], 0);
        let containersEmptyOrLow = (containers.length === 0) || (totalStored < 0.10 * totalCapacity);

        let canWithdrawFromSpawn = (!recoveryMode);

        if (!creep.memory.energyTargetId) {
            let containerTargets = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
            });
            let storageTargets = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
            });
            let spawnsExtensions = [];
            if (canWithdrawFromSpawn) {
                spawnsExtensions = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_EXTENSION ||
                         s.structureType === STRUCTURE_SPAWN) &&
                        s.store[RESOURCE_ENERGY] > 0
                });
            }
            let scored = [];
            containerTargets.forEach(container => {
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
        }
        let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;
        if (
            (!canWithdrawFromSpawn && target && (target.structureType === STRUCTURE_SPAWN || target.structureType === STRUCTURE_EXTENSION))
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
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            return; // attend le prochain tick
        }
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
};
