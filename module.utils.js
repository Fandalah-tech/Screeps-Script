function getBestSource(creep) {
    let sources = creep.room.find(FIND_SOURCES);
    let counts = {};
    for (let source of sources) counts[source.id] = 0;
    for (let cName in Game.creeps) {
        let c = Game.creeps[cName];
        if (c.memory.sourceId && counts[c.memory.sourceId] !== undefined) {
            counts[c.memory.sourceId]++;
        }
    }
    let bestSource = null, min = Infinity;
    for (let source of sources) {
        if (counts[source.id] < min) {
            min = counts[source.id];
            bestSource = source;
        }
    }
    if (creep.memory.sourceId) {
        let s = Game.getObjectById(creep.memory.sourceId);
        if (s) return s;
    }
    if (bestSource) {
        creep.memory.sourceId = bestSource.id;
        return bestSource;
    }
    return null;
}

function getFreeSpacesAroundSource(source) {
    let free = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let x = source.pos.x + dx, y = source.pos.y + dy;
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            let terrain = source.room.lookForAt(LOOK_TERRAIN, x, y)[0];
            if (terrain === 'plain' || terrain === 'swamp') free++;
        }
    }
    return free;
}

/**
 * Parking générique : amène le creep à une position (autour du spawn ou custom)
 */
function goToParking(creep, opts = {}) {
    
    if (opts.skipEmpty) {
        // Ignore le vidage d'énergie
    } 
        //Vider le surplus d'énergie avant parking (optionnel)
    else if (opts.emptyBeforePark !== false && creep.store && creep.store[RESOURCE_ENERGY] > 0) {
        // 1. Prio container à portée 1
        let container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];
        if (container) {
            creep.transfer(container, RESOURCE_ENERGY);
            return; // On s'arrête là, on dépose tant qu'il y a du stock
        }
        // 2. Storage room (si plein ou non)
        let storage = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE &&
                         s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];
        if (storage) {
            if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(storage, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }
        // 3. Spawn/extension à remplir
        let se = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];
        if (se) {
            if (creep.transfer(se, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(se, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
            return;
        }
    }

    // 2. Aller se park
    let parkingPos;
    if (opts.spot) {
        parkingPos = new RoomPosition(opts.spot.x, opts.spot.y, opts.spot.roomName);
    } else if (Game.spawns['Spawn1']) {
        let spawn = Game.spawns['Spawn1'];
        parkingPos = new RoomPosition(spawn.pos.x, spawn.pos.y - 4, spawn.pos.roomName);
    } else {
        parkingPos = creep.pos;
    }
    if (!creep.pos.isEqualTo(parkingPos)) {
        creep.moveTo(parkingPos, { visualizePathStyle: { stroke: '#cccccc' } });
    }
    creep.say('🚗 park');
}

module.exports = {
    getBestSource,
    getFreeSpacesAroundSource,
    goToParking,
};