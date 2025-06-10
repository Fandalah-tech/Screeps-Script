module.exports = {
    run: function(creep) {
        // === Changement d'état selon l'énergie ===
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.repairing = true;
        }

        // === Phase réparation ===
        if (creep.memory.repairing) {
             // Priorité 1 : réparer ceux < 5000
            let target = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                    s.hits < 5000
            }).sort((a, b) => a.hits - b.hits)[0];
            
            // Si aucun sous 5000, on finit de monter ceux entre 5000 et 10k
            if (!target) {
                target = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                        s.hits < 10000
                }).sort((a, b) => a.hits - b.hits)[0];
            }

            // Correction : réparer jusqu'à 10K max mais ne jamais réparer ceux déjà au-dessus de 10K
            // (cf. le filter ci-dessus)

            // 2. Sinon, répare toute autre structure abîmée (hors wall/rampart)
            if (!target) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
                });
            }

            if (target) {
                if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
                }
            } else {
                // Si rien à réparer, tu peux le faire upgrader ou idle :
                creep.memory.role = 'upgrader';
            }
            return;
        }

        // === Phase recharge ===
        // Prend l'énergie dans containers, storage, extensions, spawn (priorité container/storage)
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER ||
                 s.structureType === STRUCTURE_STORAGE ||
                 s.structureType === STRUCTURE_EXTENSION ||
                 s.structureType === STRUCTURE_SPAWN) &&
                s.store[RESOURCE_ENERGY] > 0
        });
        if (targets.length > 0) {
            if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    }
};
