module.exports = {
    run: function(creep, recoveryMode) {
        
        //console.log(`[UPGRADER] ${creep.name} - role: ${creep.memory.role}, upgrading: ${creep.memory.upgrading}, carry: ${creep.store[RESOURCE_ENERGY]}`);

        // Nettoie tout flag builder restant
        delete creep.memory.building;
        delete creep.memory.buildSiteId;
        delete creep.memory.repairing;
        delete creep.memory.repairTargetId;

        let room = creep.room;
        let rcLevel = room.controller.level;
        
        // Toujours forcer la state machine, quoi qu'il arrive
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false;
        } else {
            creep.memory.upgrading = true;
        }

        // === RC3+ : idle complet si énergie basse ===
        if (rcLevel >= 3) {
            let threshold = room.energyCapacityAvailable * 0.6; // 60%
            if (room.energyAvailable < threshold) {
                creep.memory.upgrading = false; // force l'idle
                creep.say('🔋 wait');
                let parkingPos = new RoomPosition(Game.spawns['Spawn1'].pos.x, Game.spawns['Spawn1'].pos.y -4, Game.spawns['Spawn1'].pos.roomName);
                if (!creep.pos.isEqualTo(parkingPos)) {
                    creep.moveTo(parkingPos, {visualizePathStyle: {stroke: '#8888ff'}});
                }
                return;
            }
        }
        
        // PHASE UPGRADE
        if (creep.memory.upgrading) {
            creep.memory.energyTargetId = undefined;
            if (creep.upgradeController(room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
            return;
        }

        // === PHASE RECHARGE SECURE ===
        let containers = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
        });
        let storages = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
        });

        let best = null;
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            best = containers[0];
        }
        if (storages.length > 0) {
            storages.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (!best || storages[0].store[RESOURCE_ENERGY] > best.store[RESOURCE_ENERGY]) {
                best = storages[0];
            }
        }

        if (best) {
            if (creep.withdraw(best, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(best, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            // Pickup énergie tombée
            let dropped = room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            // Sinon, idle total (pas d'énergie dispo)
        }
    }
};
