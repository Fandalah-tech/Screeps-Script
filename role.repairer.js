const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep, recoveryMode) {
        if (recoveryMode) {
            goToParking(creep, {role: 'repairer'});
            return;
        }

        const initialThreshold = 10000;
        const repairThreshold = 5000;

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

            // Initialisation murs/ramparts
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
                    newTarget = creep.room.find(FIND_STRUCTURES, {
                        filter: s =>
                            (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                            s.hits < initialThreshold
                    }).sort((a, b) => a.hits - b.hits)[0];
                } else {
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

            // Cible invalide ou réparée
            if (!target || target.hits >= (target.structureType === STRUCTURE_WALL || target.structureType === STRUCTURE_RAMPART ? initialThreshold : target.hitsMax)) {
                creep.memory.repairTargetId = undefined;
                                // Nouvelle recherche sur autres structures
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s =>
                        s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART &&
                        (s.hits / s.hitsMax) < 0.80 // Seulement si < 80% HP
                });
                if (target) {
                    creep.memory.repairTargetId = target.id;
                }
            }

            // Encore rien à faire ? Vidage et parking
            if (!target) {
                creep.memory.repairing = false;
                goToParking(creep, {role: 'repairer', emptyBeforePark: true});
                return;
            }

            // Réparation active
            if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
            }
            return;
        }

        // === PHASE RECHARGE ===

        // Sélection source d’énergie
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
            let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId === container.id);
            scored.push({target: container, score: container.store[RESOURCE_ENERGY] - assigned * 50});
        });
        storageTargets.forEach(storage => {
            let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId === storage.id);
            scored.push({target: storage, score: storage.store[RESOURCE_ENERGY] - assigned * 50});
        });
        spawnsExtensions.forEach(sx => {
            let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId === sx.id);
            scored.push({target: sx, score: (sx.store ? sx.store[RESOURCE_ENERGY] : 0) - assigned * 50});
        });

        if (scored.length > 0) {
            scored.sort((a, b) => b.score - a.score);
            if (scored[0].score > 0) {
                creep.memory.energyTargetId = scored[0].target.id;
            }
        }

        let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;
        if (!recoveryMode && target && (target.structureType === STRUCTURE_SPAWN || target.structureType === STRUCTURE_EXTENSION)) {
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
                return;
            }
            goToParking(creep, {role: 'repairer'});
            return;
        }

        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
};
