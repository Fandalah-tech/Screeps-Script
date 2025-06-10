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

        // === PHASE RECHARGE ===

        // 1. Cherche un container à côté du controller
        let controllerContainer = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER &&
                s.pos.getRangeTo(creep.room.controller) <= 3 &&
                s.store[RESOURCE_ENERGY] > 0
        })[0];

        if (controllerContainer) {
            if (creep.withdraw(controllerContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(controllerContainer, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // 2. Fallback : cherche n'importe quel container avec énergie
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER &&
                s.store[RESOURCE_ENERGY] > 0
        });
        if (containers.length > 0) {
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // 3. Fallback : spawn/extensions si quotas atteints
        let totalCreeps = Object.keys(Game.creeps).length;
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: structure =>
                (structure.structureType === STRUCTURE_EXTENSION ||
                 structure.structureType === STRUCTURE_SPAWN) &&
                structure.store[RESOURCE_ENERGY] > 0
        });
        if (totalCreeps >= quota_max && targets.length > 0) {
            if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }

        // 4. Fallback early : harvest direct à la source
        let sources = creep.room.find(FIND_SOURCES);
        if (sources.length) {
            let source = creep.pos.findClosestByPath(sources);
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    }
};
