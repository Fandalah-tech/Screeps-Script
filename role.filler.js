// role.filler.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.filling) creep.memory.filling = false;

        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.say('🔄 fill');
        }
        if (!creep.memory.filling && creep.store.getFreeCapacity() === 0) {
            creep.memory.filling = true;
            creep.say('⚡ deliver');
        }

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
            } else {
                goToParking(creep, { role: 'filler' });
                return;
            }
        }

        const storage = creep.room.storage;
        if (storage && storage.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            goToParking(creep, { role: 'filler' });
        }
    }
};
