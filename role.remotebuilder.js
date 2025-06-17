// role.remotebuilder.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.working) creep.memory.working = false;

        // Switch
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄 refill');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🚧 build');
        }

        const targetRoom = creep.memory.remoteRoom;
        if (!targetRoom) return goToParking(creep, { role: 'remotebuilder' });

        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { visualizePathStyle: { stroke: '#aaaaaa' } });
            return;
        }

        if (creep.memory.working) {
            const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (targets.length > 0) {
                targets.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
                if (creep.build(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            } else {
                goToParking(creep, { role: 'remotebuilder' });
                return;
            }
        }

        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
        });
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        goToParking(creep, { role: 'remotebuilder' });
    }
};
