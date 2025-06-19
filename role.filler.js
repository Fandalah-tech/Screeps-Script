const {
    goToParking,
    assignMiningSlotFromMemory,
    smartMiningMoveAndAction,
    releaseMiningSlot
} = require('module.utils');


module.exports = {
    run: function(creep) {
        if (!creep.memory.filling) creep.memory.filling = false;

        // Switch mode
        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.say('🔄 fill');
        }
        if (!creep.memory.filling && (creep.store.getFreeCapacity() === 0 || creep.memory.justLoaded)) {
            creep.memory.filling = true;
            creep.memory.justLoaded = false;
            creep.say('⚡ deliver');
        }

        // --- Mode "remplir extensions/spawn" ---
        if (creep.memory.filling) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                targets.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
            goToParking(creep, { role: 'filler' });
            return;
        }

        // --- Mode recharge ---
        // 1. Containers/storage (classique)
        let storages = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                s.store[RESOURCE_ENERGY] > 0
        });

        if (storages.length > 0) {
            storages.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(storages[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storages[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 2. Energie au sol (early game)
        let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= 100
        });
        if (dropped.length > 0) {
            dropped.sort((a, b) => b.amount - a.amount);
            if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            } else {
                creep.memory.justLoaded = true;
            }
            return;
        }

        // 3. Fallback : miner une source si rien d'autre
        
        if (smartMiningMoveAndAction(creep, { roles: [creep.memory.role], timeout: 5 })) {
            // La fonction gère tout, on ne fait rien de plus ici.
            return;
        }
        
        // Si on arrive ici, rien à faire => park
        goToParking(creep, { role: 'filler' });
        creep.say('🚶 park');

    }
};
