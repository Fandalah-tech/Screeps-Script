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


         // === PHASE RECHARGE SECURE ===
        
        let numHarvesters = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester');
        let numSuperHarvester = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
        let safeHarvesterCount = numHarvesters + numSuperHarvester;
        let quota_min_harvester = 3; // adapte selon ta logique
        
        let canWithdrawFromSpawn = (safeHarvesterCount >= quota_min_harvester);
        
        // On liste toutes les cibles possibles
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store[RESOURCE_ENERGY] > 0
        });
        let storages = creep.room.find(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_STORAGE &&
                structure.store[RESOURCE_ENERGY] > 0
        });
        let spawnsExtensions = [];
        if (canWithdrawFromSpawn) {
            spawnsExtensions = creep.room.find(FIND_STRUCTURES, {
                filter: structure =>
                    (structure.structureType === STRUCTURE_EXTENSION ||
                     structure.structureType === STRUCTURE_SPAWN) &&
                    structure.store[RESOURCE_ENERGY] > 0
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
            // Si tu veux les extensions/spawn en dernier
            best = spawnsExtensions[0];
        }
        
        if (best) {
            if (creep.withdraw(best, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(best, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            // Option : ramasser énergie tombée à proximité
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
