const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep, recoveryMode) {
        
        // Nettoyage éventuel de mémoires obsolètes
        delete creep.memory.building;
        delete creep.memory.buildSiteId;
        delete creep.memory.repairing;
        delete creep.memory.repairTargetId;
        
        if (recoveryMode) {
            require('module.utils').goToParking(creep, {role: 'upgrader'});
            return;
        }
        
        if (Memory.forceParkUpgraders) {
            goToParking(creep, {role: 'upgrader'});
            return;
        }

        let room = creep.room;
        let rcLevel = room.controller.level;
        let energyAvailable = room.energyAvailable;
        let energyCapacity = room.energyCapacityAvailable;

        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false;
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.upgrading = true;
        }

        // === PHASE UPGRADE ===
        if (creep.memory.upgrading) {
            creep.memory.energyTargetId = undefined;
            if (creep.upgradeController(room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
            return;
        }

        // === PHASE RECHARGE ===
        // 1. Container dédié près du controller
        let ctrlContainer = room.find(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER &&
                s.store[RESOURCE_ENERGY] > 0 &&
                s.pos.getRangeTo(room.controller) <= 3 // Ajuste le rayon si nécessaire
        })[0];
        
        let storages = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
        });
        
        let best = null;
        if (ctrlContainer) {
            best = ctrlContainer;
        } else if (storages.length > 0) {
            storages.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            best = storages[0];
        }

        // 2. À partir de RC3 et si énergie suffisante, autorise le spawn/extensions
        let canWithdrawFromSpawn = (rcLevel >= 3 && energyAvailable >= energyCapacity * 0.7);
        if (!best && canWithdrawFromSpawn) {
            let spawnsExtensions = room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION) &&
                    s.store[RESOURCE_ENERGY] > 0
            });
            if (spawnsExtensions.length > 0) {
                best = spawnsExtensions[0];
            }
        }

        // 3. Pickup énergie tombée
        if (!best) {
            let dropped = room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }
        }

        // 4. Encore rien ? Mine comme un harvester
        if (!best) {
            let source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#aaffaa'}});
                }
            } else {
                goToParking(creep, {role: 'upgrader'});
            }
            return;
        }

        // 5. Withdraw classique si cible trouvée
        if (creep.withdraw(best, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(best, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
};
