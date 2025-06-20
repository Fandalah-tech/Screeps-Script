// role.remotebuilder.js
const { goToParking } = require('module.utils');

function getPriorityConstructionSite(creep) {
    const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (sites.length === 0) return null;

    const priority = [
        STRUCTURE_CONTAINER,
        STRUCTURE_EXTENSION,
        STRUCTURE_TOWER,
        STRUCTURE_ROAD
    ];

    for (const type of priority) {
        const match = sites.find(s => s.structureType === type);
        if (match) return match;
    }

    // Sinon, site le plus proche
    sites.sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
    return sites[0];
}

module.exports = {
    run: function(creep) {
        if (!creep.memory.working) creep.memory.working = false;

        // Switch état
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

        // Aller dans la remote si besoin
        if (creep.room.name !== targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { visualizePathStyle: { stroke: '#aaaaaa' } });
            return;
        }

        // --- Mode travail : construire (ou upgrade en fallback)
        if (creep.memory.working) {
            const target = getPriorityConstructionSite(creep);

            if (target) {
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }

            // Fallback : upgrade controller si accessible
            if (creep.room.controller) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#aaaaaa' } });
                }
                return;
            }

            goToParking(creep, { role: 'remotebuilder' });
            return;
        }

        // --- Recharge énergie ---
        // 1. Prendre dans un container local
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

        // 2. Ramasser énergie au sol
        const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
        });
        if (dropped.length > 0) {
            dropped.sort((a, b) => b.amount - a.amount);
            if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 3. Miner une source (en remote)
        const sources = creep.room.find(FIND_SOURCES);
        if (sources.length > 0) {
            // Option : prioriser une source sans harvester dessus, mais simple suffit pour début
            if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#00ff00' } });
            }
            return;
        }

        // 4. Rien à faire : park
        goToParking(creep, { role: 'remotebuilder' });
    }
};
