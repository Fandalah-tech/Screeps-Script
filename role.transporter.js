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
        
        if (creep.memory.filling === undefined) creep.memory.filling = false;

        // Switch de mode
        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.say('🔄 fill');
        }
        if (!creep.memory.filling && (
            (creep.store.getFreeCapacity() === 0) || creep.memory.justLoaded)) {
            creep.memory.filling = true;
            creep.memory.justLoaded = false;
            creep.say('📦 pickup');
        }

        // --- Mode livraison ---
        if (creep.memory.filling) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION) &&
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
        
        // 0. Calcul de la demande réelle
        let energyNeeded = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION)
        }).reduce((sum, s) => sum + s.store.getFreeCapacity(RESOURCE_ENERGY), 0);
        
        const hasStorage = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE
        }).length > 0;
        
        // Si pas de storage, on ne prend que ce qui est nécessaire
        if (!hasStorage) {
            if (creep.store[RESOURCE_ENERGY] >= energyNeeded || energyNeeded === 0) {
                creep.memory.filling = true;
                return;
            }
        }
        
        // --- Mode remplir ---
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
        });
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 2. Energie au sol
        let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= 50
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

        // 3. Fallback : miner une source si rien d’autre
        if (creep.getActiveBodyparts(WORK) > 0) {
            if (smartMiningMoveAndAction(creep, { roles: [creep.memory.role], timeout: 5 })) {
                return;
            }
        }

        // 4. Park adjacent à une mining spot à surveiller
        let energySpots = [];
        if (Memory.miningSlots && Memory.miningSlots[creep.room.name]) {
            energySpots = Memory.miningSlots[creep.room.name]
                .filter(slot => slot.takenBy)
                .map(slot => new RoomPosition(slot.x, slot.y, creep.room.name));
        }
        if (energySpots.length > 0) {
            let target = creep.pos.findClosestByPath(energySpots, { ignoreCreeps: true });
            if (target) {
                let adjacent = [];
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        let x = target.x + dx;
                        let y = target.y + dy;
                        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                        let isMiningSlot = Memory.miningSlots[creep.room.name].some(slot => slot.x === x && slot.y === y);
                        if (isMiningSlot) continue;
                        let terrain = Game.map.getRoomTerrain(creep.room.name);
                        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                        let hasCreep = creep.room.lookForAt(LOOK_CREEPS, x, y).length > 0;
                        if (hasCreep) continue;
                        adjacent.push(new RoomPosition(x, y, creep.room.name));
                    }
                }
                if (adjacent.length > 0) {
                    let parkPos = creep.pos.findClosestByPath(adjacent, { ignoreCreeps: true }) || adjacent[0];
                    if (!creep.pos.isEqualTo(parkPos)) {
                        creep.moveTo(parkPos, { visualizePathStyle: { stroke: '#44ff44' } });
                    }
                    return;
                }
            }
        }

        // 5. Sinon, park classique
        goToParking(creep, { role: 'transporter' });
        creep.say('🚶 park');

    }
};
