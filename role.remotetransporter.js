// role.remotetransporter.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.filling) creep.memory.filling = false;

        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.say('🔄 refill');
        }
        if (!creep.memory.filling && creep.store.getFreeCapacity() === 0) {
            creep.memory.filling = true;
            creep.say('📦 haul');
        }

        const targetRoom = creep.memory.remoteRoom;
        const homeRoom = creep.memory.room;

        if (!targetRoom || !homeRoom) return;

        if (creep.memory.filling) {
            const home = Game.rooms[homeRoom];
            if (!home || creep.room.name !== homeRoom) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom), { visualizePathStyle: { stroke: '#ffffff' } });
                return;
            }

            const targets = home.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_STORAGE ||
                     s.structureType === STRUCTURE_CONTAINER ||
                     s.structureType === STRUCTURE_SPAWN) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                goToParking(creep, { role: 'remotetransporter' });
            }
            return;
        }

        // === Go to remote to fetch energy ===
        const remote = Game.rooms[targetRoom];
        if (!remote || creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        const containers = remote.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
        });
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            goToParking(creep, { role: 'remotetransporter' });
        }
    }
};
