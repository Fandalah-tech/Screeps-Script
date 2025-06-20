const {
    goToParking,
    assignMiningSlotFromMemory,
    smartMiningMoveAndAction,
    releaseMiningSlot
} = require('module.utils');

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
            creep.say('🔧 repair');
        }

        // --- Mode réparation ---
        if (creep.memory.working) {
            // 1. Ramparts 1 → 10 000 (construction ou nouveaux)
            let rampartsLow = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_RAMPART && s.hits < 10000
            });
            if (rampartsLow.length > 0) {
                rampartsLow.sort((a, b) => a.hits - b.hits);
                if (creep.repair(rampartsLow[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(rampartsLow[0], { visualizePathStyle: { stroke: '#00ff00' } });
                }
                return;
            }

            // 2. Ramparts < 5000 → remonter à 10 000 (maintenance)
            let rampartsMaint = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_RAMPART && s.hits < 5000
            });
            if (rampartsMaint.length > 0) {
                rampartsMaint.sort((a, b) => a.hits - b.hits);
                if (creep.repair(rampartsMaint[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(rampartsMaint[0], { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

        //3. 🎯 Si déjà une cible en mémoire, on la garde tant qu'elle existe et reste sous 90%
        let target = Game.getObjectById(creep.memory.repairingId);
        if (
            target &&
            target.hits < target.hitsMax * 0.90 &&
            target.structureType !== STRUCTURE_WALL &&
            target.structureType !== STRUCTURE_RAMPART
        ) {
            // continue repairing
        } else {
            // 🔄 Nouvelle cible
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.hits < s.hitsMax * 0.75 &&
                    s.structureType !== STRUCTURE_WALL &&
                    s.structureType !== STRUCTURE_RAMPART
            });
            if (targets.length > 0) {
                targets.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
                target = targets[0];
                creep.memory.repairingId = target.id;
            } else {
                creep.memory.repairingId = null;
            }
        }
        
        if (target) {
            if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

            // 4. Rien à réparer : park
            goToParking(creep, { role: 'repairer' });
            return;
        }

        // --- Mode recharge ---
        // 1. Containers/storage
        let sources = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                s.store[RESOURCE_ENERGY] > 0
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
            // La fonction gère tout, on ne fait rien de plus ici.
            return;
        }
        
        // Si on arrive ici, rien à faire => park
        goToParking(creep, { role: 'repairer' });
        creep.say('🚶 park');


    }
};
