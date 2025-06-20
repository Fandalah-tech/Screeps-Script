const {
    goToParking,
    assignMiningSlotFromMemory,
    smartMiningMoveAndAction,
    releaseMiningSlot,
    releaseMiningSlotIfLeft
} = require('module.utils');

module.exports = {
    run: function(creep) {
        releaseMiningSlotIfLeft(creep);

        if (!creep.memory.working) creep.memory.working = false;

        // Switch state
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄 refill');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('🚧 build');
        }

        // --- Mode construction ---
        if (creep.memory.working) {
            let target = Game.getObjectById(creep.memory.buildTargetId);

            if (!target || target.progress === target.progressTotal) {
                // Choix du site de construction prioritaire commun
                const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (sites.length > 0) {
                    sites.sort((a, b) => {
                        const priority = {
                            container: 1,
                            extension: 2,
                            tower: 3,
                            road: 4
                        };
                        const pa = priority[a.structureType] || 99;
                        const pb = priority[b.structureType] || 99;
                        return pa - pb;
                    });
                    creep.memory.buildTargetId = sites[0].id;
                    target = sites[0];
                }
            }

            if (target) {
                if (creep.build(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }

            // Aucun chantier → fallback upgrade
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#aaaaaa' } });
            }
            return;
        }

        // --- Mode recharge ---
        // 1. Containers/storage
        let sources = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                s.store[RESOURCE_ENERGY] > 200
        });

        if (sources.length > 0) {
            sources.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(sources[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 2. Energie au sol
        let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= 100
        });

        if (dropped.length > 0) {
            dropped.sort((a, b) => b.amount - a.amount);
            if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }
        
        const utils = require('module.utils');

        if (utils.checkFillWaitTimeout(creep, { maxTicks: 3 })) {
            // Part avec ce qu'il a, même s'il n'est pas plein
            // Ne retourne pas ici : laisse la suite du code le faire builder/upgrader/repair
        }

        // 3. Fallback : miner une source si rien d'autre
        if (smartMiningMoveAndAction(creep, { roles: [creep.memory.role], timeout: 5 })) {
            return;
        }
    }
};
