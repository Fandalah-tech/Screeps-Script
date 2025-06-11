module.exports = {
    run: function(creep) {
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.repairing = true;
        }

        // === Phase réparation ===
        if (creep.memory.repairing) {
            // 1. Remparts/murs en-dessous du seuil "critique"
            let target = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                    (s.hits < 5000 || s.hits < 10000 && !Memory.wallsInitialized)
            }).sort((a, b) => a.hits - b.hits)[0];
        
            // Si tous les murs/remparts sont à 10k ou plus, considère que l'init est faite
            if (!Memory.wallsInitialized) {
                let lowest = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL)
                }).sort((a, b) => a.hits - b.hits)[0];
                if (lowest && lowest.hits >= 10000) {
                    Memory.wallsInitialized = true;
                }
            }
        
            // 2. Répare autres structures abîmées
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
                // Option : idle/parking ou switch de rôle temporaire
            }
            return;
        }

        // === PHASE RECHARGE REPAIRER - SECURE & BALANCED ===
        
        let numHarvesters = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester');
        let numSuperHarvester = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
        let safeHarvesterCount = numHarvesters + numSuperHarvester;
        let quota_min_harvester = 3; // adapte si besoin
        
        let canWithdrawFromSpawn = (safeHarvesterCount >= quota_min_harvester);
        
        // Sélection du meilleur container/storage selon la charge (load balancing)
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
        
        // Utilisation de la cible mémorisée
        let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;
        
        // Si la cible est invalide (disparue, vide...), on efface la mémoire pour un nouveau calcul la prochaine fois
        if (!target ||
            (target.store && target.store[RESOURCE_ENERGY] === 0)) {
            creep.memory.energyTargetId = undefined;
            // Ramasse énergie tombée si possible avant d'attendre
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            return; // attend le prochain tick pour recalculer une nouvelle cible
        }
        
        // Retrait classique (withdraw sur la cible)
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }

    }
};
