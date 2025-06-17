// role.builder.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.working) creep.memory.working = false;

        // Switch mode
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄 refill');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🚧 build');
        }

        // Mode "build"
        if (creep.memory.working) {
            const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (targets.length > 0) {
                targets.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
                if (creep.build(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            } else {
                // Si rien à construire, recycle comme upgrader
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#aaaaaa' } });
                }
                return;
            }
        }

        // Mode "recharge"
        const sources = creep.room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                         s.store[RESOURCE_ENERGY] > 0
        });
        if (sources.length > 0) {
            sources.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(sources[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            // Pickup énergie au sol si pas de container/storage
            const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
            });
            if (dropped.length > 0) {
                dropped.sort((a, b) => b.amount - a.amount);
                if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                goToParking(creep, { role: 'builder' });
            }
        }
    }
};
