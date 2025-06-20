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
            // Trouve les containers qui ne sont PAS sur une case minière réservée
            let miningSlots = Memory.miningSlots && Memory.miningSlots[creep.room.name] || [];
            let safeContainers = storages.filter(container => {
                // Est-ce que ce container occupe une case minière ?
                return !miningSlots.some(slot => slot.x === container.pos.x && slot.y === container.pos.y);
            });
            let targetContainer = safeContainers[0] || storages[0]; // Si aucun safe, on prend le meilleur dispo
        
            if (creep.withdraw(targetContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                // MoveTo sur une case adjacente si slot minier, sinon direct
                if (miningSlots.some(slot => slot.x === targetContainer.pos.x && slot.y === targetContainer.pos.y)) {
                    // Cherche une case libre adjacente pour se placer (hors minage)
                    let adjacent = _.shuffle([
                        [0, -1], [1, 0], [0, 1], [-1, 0], // orthogonal
                        [-1, -1], [1, -1], [1, 1], [-1, 1] // diagonals si tu veux
                    ]).map(([dx, dy]) => new RoomPosition(targetContainer.pos.x + dx, targetContainer.pos.y + dy, targetContainer.pos.roomName))
                    .find(pos => pos.lookFor(LOOK_CREEPS).length === 0 && pos.lookFor(LOOK_TERRAIN)[0] !== 'wall');
                    if (adjacent) {
                        creep.moveTo(adjacent, { visualizePathStyle: { stroke: '#ffaa00' } });
                    } else {
                        // Pas de case libre, fait au mieux (moveTo normal)
                        creep.moveTo(targetContainer, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                } else {
                    creep.moveTo(targetContainer, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
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
