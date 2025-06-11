module.exports = {
    run: function(creep, quota_max) {
        quota_max = quota_max || 8;

        // Mode "state machine" : upgrade jusqu'à vide, recharge à fond
        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.upgrading = false;
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.upgrading = true;
        }

        // === PHASE UPGRADE ===
        if (creep.memory.upgrading) {
            if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
            return;
        }

        
        // === PHASE RECHARGE SECURE & BALANCED ===
        
        let numHarvesters = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester');
        let numSuperHarvester = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
        let safeHarvesterCount = numHarvesters + numSuperHarvester;
        let quota_min_harvester = 3; // adapte à ta logique
        
        let canWithdrawFromSpawn = (safeHarvesterCount >= quota_min_harvester);
        
        // Sélection de la cible uniquement si pas déjà mémorisée ou si cible plus valide
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
        
            // Charge balancing sur containers
            let scored = [];
            containers.forEach(container => {
                let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == container.id);
                scored.push({
                    target: container,
                    score: container.store[RESOURCE_ENERGY] - assigned * 50 // 50 = poids d'un creep assigné (ajuste si besoin)
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
            // Option : ramasse énergie tombée avant de repartir
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
        
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }

    }
};
