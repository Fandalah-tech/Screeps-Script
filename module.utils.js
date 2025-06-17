// module.utils.js

module.exports = {
    getClosestByPath(creep, targets) {
        return creep.pos.findClosestByPath(targets, {
            ignoreCreeps: true
        });
    },

    moveTo(creep, target, opts = {}) {
        return creep.moveTo(target, {
            visualizePathStyle: { stroke: '#ffffff' },
            ...opts
        });
    },

    findContainerNear(pos, range = 2) {
        return pos.findInRange(FIND_STRUCTURES, range, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];
    },

    logError(creep, err) {
        console.log(`❌ ${creep.name} (${creep.memory.role}) | ${err}`);
    },

    shouldBuildRepairer(room) {
        if (room.controller.level > 1) return true;
        const ramparts = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_RAMPART && s.hits < 5000
        });
        return ramparts.length > 0;
    },

    shouldBuildFiller(room) {
        return room.controller.level >= 2;
    },

    shouldIncludeRole(role, room) {
        if (role === 'filler') return module.exports.shouldBuildFiller(room);
        if (role === 'repairer') return module.exports.shouldBuildRepairer(room);
        return true;
    },

    isContainerProperlyPlaced(containerPos, sourcePositions) {
        return sourcePositions.some(src => {
            return Math.max(Math.abs(containerPos.x - src.x), Math.abs(containerPos.y - src.y)) <= 1;
        });
    },
    
    /**
     * Parking générique pour rôles en attente.
     * Par défaut, essaie de se garer à côté du spawn, sinon dans un coin.
     */
    goToParking(creep, { role = null } = {}) {
        let target = creep.room.find(FIND_MY_SPAWNS)[0];
        if (target) {
            creep.moveTo(target.pos.x + 2, target.pos.y + 2, { visualizePathStyle: { stroke: '#888888' } });
        } else {
            // Coin de la room
            creep.moveTo(48, 48, { visualizePathStyle: { stroke: '#888888' } });
        }
    },
    
    /**
     * Retourne les positions libres autour d’une source (format RoomPosition[])
     */
     getFreeSpacesAroundSource(source) {
        const positions = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = source.pos.x + dx;
                const y = source.pos.y + dy;
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                const look = source.room.lookForAt(LOOK_TERRAIN, x, y);
                if (look.length && look[0] !== 'wall') {
                    positions.push(new RoomPosition(x, y, source.room.name));
                }
            }
        }
        return positions;
    },
    
    getEmptySpotsAround(pos, range = 1) {
        const spots = [];
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = pos.x + dx;
                const y = pos.y + dy;
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                // On vérifie qu'il n'y a pas de mur ni de structure
                const terrain = pos.roomName ? Game.map.getRoomTerrain(pos.roomName) : Game.map.getRoomTerrain(pos.room.name);
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
                // Vérifie qu'il n'y a pas déjà une structure
                const hasStructure = Game.rooms[pos.roomName || pos.room.name]
                    .lookForAt(LOOK_STRUCTURES, x, y).length > 0;
                if (!hasStructure) {
                    spots.push(new RoomPosition(x, y, pos.roomName || pos.room.name));
                }
            }
        }
        return spots;
    }
    
};
