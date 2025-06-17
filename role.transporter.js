const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.filling) creep.memory.filling = false;

        // Switch state
        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.say('🔄 fill');
        }
        if (!creep.memory.filling && creep.store.getFreeCapacity() === 0) {
            creep.memory.filling = true;
            creep.say('📦 drop');
        }

        if (creep.memory.filling) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_TOWER) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
            goToParking(creep, { role: 'transporter' });
            return;
        }

        // === Recharge ===
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                s.store[RESOURCE_ENERGY] > s.store.getCapacity(RESOURCE_ENERGY) * 0.1 // >=10%
        });

        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            // Va ramasser l'énergie au sol
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 0
            });
            if (dropped.length > 0) {
                dropped.sort((a, b) => b.amount - a.amount);
                if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                goToParking(creep, { role: 'transporter' });
            }
        }
    }
};
