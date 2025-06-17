// role.repairer.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.working) creep.memory.working = false;

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄 refill');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🔧 repair');
        }

        if (creep.memory.working) {
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.hits < s.hitsMax &&
                             s.structureType !== STRUCTURE_WALL &&
                             s.structureType !== STRUCTURE_RAMPART
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.hits - b.hits);
                if (creep.repair(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            } else {
                goToParking(creep, { role: 'repairer' });
                return;
            }
        }

        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                         s.store[RESOURCE_ENERGY] > 0
        });
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            goToParking(creep, { role: 'repairer' });
        }
    }
};
