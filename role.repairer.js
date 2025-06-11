module.exports = {
    run: function(creep) {
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.repairing = true;
        }

        if (creep.memory.repairing) {
            // Logique de priorité comme vu plus haut
            let target = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                    s.hits < 5000
            }).sort((a, b) => a.hits - b.hits)[0];
            if (!target) {
                target = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                        s.hits < 10000
                }).sort((a, b) => a.hits - b.hits)[0];
            }
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
                // Il attend sagement, il ne change PAS de rôle
                creep.say('Idle');
                // Option : retourne vers un coin/parking de la base
                // creep.moveTo(Game.spawns['Spawn1']);
            }
            return;
        }

        // === PHASE RECHARGE SECURE (optimisé) ===
        
        // Vérifie la chaîne logistique
        let numHarvesters = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester');
        let numSuperHarvester = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
        let safeHarvesterCount = numHarvesters + numSuperHarvester;
        let quota_min_harvester = 3; // adapte selon ta logique
        let canWithdrawFromSpawn = (safeHarvesterCount >= quota_min_harvester);
        
        // Liste toutes les cibles potentielles
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
        let spawnsExtensions = [];
        if (canWithdrawFromSpawn) {
            spawnsExtensions = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_SPAWN) &&
                    s.store[RESOURCE_ENERGY] > 0
            });
        }
        
        // On cherche le container/storage le plus plein
        let best = null;
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            best = containers[0];
        }
        if (storages.length > 0) {
            storages.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (!best || storages[0].store[RESOURCE_ENERGY] > best.store[RESOURCE_ENERGY]) {
                best = storages[0];
            }
        }
        if (!best && spawnsExtensions.length > 0) {
            best = spawnsExtensions[0];
        }
        
        if (best) {
            if (creep.withdraw(best, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(best, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            // Ramasse énergie tombée à proximité
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            // Sinon, idle
        }

    }
};
