// module.utils.js (corrigé complet avec fonctions nommées)

function getClosestByPath(creep, targets) {
    return creep.pos.findClosestByPath(targets, { ignoreCreeps: true });
}

function moveTo(creep, target, opts = {}) {
    return creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' }, ...opts });
}

function findContainerNear(pos, range = 2) {
    return pos.findInRange(FIND_STRUCTURES, range, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    })[0];
}

function logError(creep, err) {
    console.log(`❌ ${creep.name} (${creep.memory.role}) | ${err}`);
}

function shouldBuildRepairer(room) {
    if (room.controller.level > 1) return true;
    const ramparts = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_RAMPART && s.hits < 5000
    });
    return ramparts.length > 0;
}

function shouldBuildFiller(room) {
    return room.controller.level >= 2;
}

function shouldIncludeRole(role, room) {
    if (role === 'filler') return shouldBuildFiller(room);
    if (role === 'repairer') return shouldBuildRepairer(room);
    return true;
}

function isContainerProperlyPlaced(containerPos, sourcePositions) {
    return sourcePositions.some(src =>
        Math.max(Math.abs(containerPos.x - src.x), Math.abs(containerPos.y - src.y)) <= 1
    );
}

    function goToParking(creep, { role = null } = {}) {
        let spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) {
            creep.moveTo(48, 48, { visualizePathStyle: { stroke: '#888888' } });
            return;
        }
        // Offset parking spots for roles to avoid pile-up
        let offset = { x: 2, y: 2 };
        if (role === 'filler') offset = { x: 4, y: -4 };
        if (role === 'repairer') offset = { x: -4, y: -4 };
        if (role === 'transporter') offset = { x: 0, y: -5 };
        // Tu peux ajouter d'autres rôles ici si tu veux
    
        creep.moveTo(spawn.pos.x + offset.x, spawn.pos.y + offset.y, { visualizePathStyle: { stroke: '#888888' } });
    }

function getFreeSpacesAroundSource(source) {
    const spots = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = source.pos.x + dx;
            const y = source.pos.y + dy;
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            const terrain = source.room.lookForAt(LOOK_TERRAIN, x, y);
            if (terrain.length && terrain[0] !== 'wall') {
                const hasStructure = source.room.lookForAt(LOOK_STRUCTURES, x, y).length > 0;
                if (!hasStructure) {
                    spots.push(new RoomPosition(x, y, source.room.name));
                }
            }
        }
    }
    return spots;
}

function getEmptySpotsAround(pos, range = 1) {
    const spots = [];
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = pos.x + dx;
            const y = pos.y + dy;
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            const terrain = Game.map.getRoomTerrain(pos.roomName);
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
            const hasStructure = Game.rooms[pos.roomName].lookForAt(LOOK_STRUCTURES, x, y).length > 0;
            if (!hasStructure) {
                spots.push(new RoomPosition(x, y, pos.roomName));
            }
        }
    }
    return spots;
}

function getAvailableSuperHarvesterContainers(room) {
    const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    const used = _.map(
        _.filter(Game.creeps, c =>
            c.memory.role === 'superharvester' &&
            c.memory.containerId
        ),
        c => c.memory.containerId
    );

    const slots = (Memory.miningSlots && Memory.miningSlots[room.name]) || [];

    return containers.filter(container => {
        // Exclure les containers déjà assignés
        if (used.includes(container.id)) return false;

        // Vérifie s’il est orthogonal à un slot SH
        return slots.some(slot =>
            slot.role === 'superharvester' &&
            Math.abs(slot.x - container.pos.x) + Math.abs(slot.y - container.pos.y) === 1
        );
    });
}



function assignMiningSlot(creep, roles = [creep.memory.role]) {
    let closest = null;
    let minDist = Infinity;
    const sources = creep.room.find(FIND_SOURCES);
    for (let source of sources) {
        const spots = getFreeSpacesAroundSource(source);
        for (let pos of spots) {
            const taken = _.some(Game.creeps, c =>
                c.name !== creep.name &&
                roles.includes(c.memory.role) &&
                c.memory.targetPos &&
                c.memory.targetPos.x === pos.x &&
                c.memory.targetPos.y === pos.y &&
                c.memory.sourceId === source.id
            );
            if (taken) continue;
            const result = PathFinder.search(creep.pos, { pos, range: 0 }, { maxOps: 1000 });
            if (result.incomplete) continue;
            if (result.path.length < minDist) {
                closest = { source, pos };
                minDist = result.path.length;
            }
        }
    }
    if (closest) {
        creep.memory.sourceId = closest.source.id;
        creep.memory.targetPos = { x: closest.pos.x, y: closest.pos.y, roomName: closest.pos.roomName };
        return true;
    }
    return false;
}


function assignSuperHarvesterSlot(creep) {
    const roomName = creep.room.name;
    const roomSlots = Memory.miningSlots && Memory.miningSlots[roomName];
    if (!roomSlots) return false;

    const containers = creep.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    // Nettoyage : libère les slots de creeps morts
    for (let slot of roomSlots) {
        if (slot.role === 'superharvester' && slot.takenBy && !Game.creeps[slot.takenBy]) {
            slot.takenBy = null;
        }
    }

    // Recherche des slots libres avec container adjacent
    const validSlots = roomSlots.filter(slot => {
        if (slot.role !== 'superharvester' || slot.takenBy) return false;

        return containers.some(container =>
            Math.abs(container.pos.x - slot.x) + Math.abs(container.pos.y - slot.y) === 1
        );
    });

    if (validSlots.length === 0) return false;

    // Trie par proximité
    const chosen = validSlots[0]; // Respecte l’ordre de définition dans Memory.miningSlots
    // 🔒 Forçage explicite dans Memory.miningSlots
    const index = roomSlots.findIndex(s =>
        s.x === chosen.x &&
        s.y === chosen.y &&
        s.sourceId === chosen.sourceId &&
        s.role === 'superharvester'
    );
    if (index !== -1) {
        Memory.miningSlots[roomName][index].takenBy = creep.name;
    }

    const targetPos = { x: chosen.x, y: chosen.y, roomName };
    creep.memory.sourceId = chosen.sourceId;
    creep.memory.targetPos = targetPos;

    creep.memory.mining = {
        sourceId: chosen.sourceId,
        targetPos,
        since: Game.time
    };

    console.log(`✅ ${creep.name} assigned to SH slot: (${chosen.x},${chosen.y})`);
    return {
        sourceId: chosen.sourceId,
        targetPos
    };
}





function assignMiningSlotFromMemory(creep) {
    const roomSlots = Memory.miningSlots && Memory.miningSlots[creep.room.name];
    if (!roomSlots) return false;

    const freeSlots = roomSlots.filter(slot => {
        if (slot.role !== 'generic') return false;
        const takenBy = slot.takenBy;
        if (!takenBy) return true;

        const takenCreep = Game.creeps[takenBy];
        if (!takenCreep) return true;

        const tp = takenCreep.memory.targetPos;
        if (!tp || tp.x !== slot.x || tp.y !== slot.y) return true;

        return false;
    });

    // Trie les slots par proximité
    freeSlots.sort((a, b) => {
        const distA = creep.pos.getRangeTo(a.x, a.y);
        const distB = creep.pos.getRangeTo(b.x, b.y);
        return distA - distB;
    });

    if (freeSlots.length > 0) {
        const slot = freeSlots[0];
        slot.takenBy = creep.name;
        creep.memory.sourceId = slot.sourceId;
        creep.memory.targetPos = { x: slot.x, y: slot.y, roomName: creep.room.name };

        console.log(`✅ ${creep.name} assigned to mining slot: ${slot.x},${slot.y} (source: ${slot.sourceId})`);

        return {
            sourceId: slot.sourceId,
            targetPos: {
                x: slot.x,
                y: slot.y,
                roomName: creep.room.name
            }
        };
    }

    return false;
}

function releaseMiningSlot(creep) {
    
    console.log(`🔓 ${creep.name} released mining slot`);

    const roomSlots = Memory.miningSlots && Memory.miningSlots[creep.room.name];
    if (!roomSlots) return;
    for (const slot of roomSlots) {
        if (slot.takenBy === creep.name) {
            slot.takenBy = null;
            break;
        }
    }
}


function smartMiningMoveAndAction(creep, options = {}) {
    //console.log(`[debug] ${creep.name} enters smartMiningMoveAndAction`);

    const timeout = options.timeout || 5;

    // 🔁 Unifie les sources possibles de position et initialise la mémoire si manquante
    let tp = creep.memory.targetPos;
    let mining = creep.memory.mining;

    if (!tp && mining && mining.targetPos) {
        tp = mining.targetPos;
        creep.memory.targetPos = tp;
    }

    if (!mining && tp) {
        mining = { targetPos: tp, since: Game.time };
        creep.memory.mining = mining;
    }

    // 🔁 Nettoyage si mémoire corrompue
    if (tp && (typeof tp.x !== 'number' || typeof tp.y !== 'number')) {
        console.log(`⚠️ ${creep.name} memory.targetPos corrompue, reset`);
        delete creep.memory.targetPos;
        delete creep.memory.sourceId;
        delete creep.memory.mining;
        return false;
    }

    // ✅ Si le creep est bien positionné
    if (tp && creep.pos.isEqualTo(new RoomPosition(tp.x, tp.y, tp.roomName))) {
        const source = Game.getObjectById(creep.memory.sourceId);

        if (!source) {
            console.log(`⚠️ ${creep.name} sur la tuile mais source introuvable → reset`);
            delete creep.memory.targetPos;
            delete creep.memory.sourceId;
            delete creep.memory.mining;
            return false;
        }

        const hasWorkPart = creep.body.some(p => p.type === WORK && p.hits > 0);
        if (hasWorkPart) {
            const result = creep.harvest(source);
            //console.log(`⛏️ ${creep.name} harvesting ${source.id} → ${result}`);
        }

        const target = creep.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER ||
                 s.structureType === STRUCTURE_EXTENSION ||
                 s.structureType === STRUCTURE_SPAWN) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];
        
        if (target && creep.store[RESOURCE_ENERGY] > 0) {
            const role = creep.memory.role;
            const shouldTransfer =
                (role === 'harvester' || role === 'superharvester' || role === 'transporter' || role === 'filler');
        
            if (shouldTransfer) {
                const result = creep.transfer(target, RESOURCE_ENERGY);
                //console.log(`📦 ${creep.name} transferring → ${result}`);
            } else {
                console.log(`📦 ${creep.name} conserve son énergie (no transfer)`);
            }
        }


        return true;
    }

    // ⏱️ Si trop de ticks bloqué
    if (mining && mining.since && Game.time - mining.since > timeout) {
        console.log(`⚠️ ${creep.name} stuck too long → resetting mining target`);
        delete creep.memory.targetPos;
        delete creep.memory.sourceId;
        delete creep.memory.mining;
        return false;
    }

    // 📌 Affectation initiale
    if (!creep.memory.targetPos || !creep.memory.sourceId) {
        const result = assignMiningSlotFromMemory(creep);
        if (!result) return false;

        creep.memory.mining = {
            since: Game.time,
            targetPos: result.targetPos
        };
        creep.memory.targetPos = result.targetPos;
        creep.memory.sourceId = result.sourceId;
    }

    // 🧭 Mouvement vers la tuile
    if (creep.memory.targetPos) {
        creep.moveTo(
            new RoomPosition(
                creep.memory.targetPos.x,
                creep.memory.targetPos.y,
                creep.memory.targetPos.roomName
            ),
            { visualizePathStyle: { stroke: '#ffaa00' } }
        );

        if (!creep.memory.mining || !creep.memory.mining.since) {
            creep.memory.mining = {
                since: Game.time,
                targetPos: creep.memory.targetPos
            };
        }
    }

    return true;
}





function initMiningSlots(room) {
    if (!Memory.miningSlots) Memory.miningSlots = {};
    Memory.miningSlots[room.name] = [];
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;

    const sources = room.find(FIND_SOURCES);

    for (const source of sources) {
        // Utilise exactement la même logique que le plan de base
        const { shSpot, containerSpot } = getSuperHarvesterSpotAndContainer(source, spawn, room);

        if (!shSpot) continue;

        // Spot SH (rond bleu)
        Memory.miningSlots[room.name].push({
            x: shSpot.x,
            y: shSpot.y,
            sourceId: source.id,
            role: 'superharvester',
            takenBy: null
        });

        // Les autres spots (génériques), sauf le SH et le container
        const allSpots = getFreeSpacesAroundSource(source);
        for (const pos of allSpots) {
            // NE PAS réutiliser le spot SH ni le spot container !
            if (
                (pos.x === shSpot.x && pos.y === shSpot.y) ||
                (containerSpot && pos.x === containerSpot.x && pos.y === containerSpot.y)
            ) {
                continue;
            }
            Memory.miningSlots[room.name].push({
                x: pos.x,
                y: pos.y,
                sourceId: source.id,
                role: 'generic',
                takenBy: null
            });
        }
    }
    
    console.log(`✅ Mining slots initialisés pour ${room.name}`);
}

function releaseMiningSlotIfLeft(creep) {
    if (creep.memory.mining && creep.memory.mining.targetPos) {
        const { x, y, roomName } = creep.memory.mining.targetPos;
        const expected = new RoomPosition(x, y, roomName);

        // S'il est encore en route, laisse-lui quelques ticks pour arriver
        if (!creep.pos.isEqualTo(expected)) {
            if (!creep.memory.mining.since) {
                creep.memory.mining.since = Game.time;
                return;
            }

            const age = Game.time - creep.memory.mining.since;

            // Tolérance de 5 ticks avant de libérer le slot
            if (age < 5) return;

            releaseMiningSlot(creep);
            creep.memory.mining = undefined;
            creep.memory.sourceId = undefined;
            creep.memory.targetPos = undefined;
        } else {
            // Il est bien sur sa case attitrée → reset "since"
            creep.memory.mining.since = Game.time;
        }
    }
}

function getSuperHarvesterSpotAndContainer(source, spawn, room) {
    // Directions orthogonales
    const orthoDirs = [
        { dx:  0, dy: -1 }, // N
        { dx:  1, dy:  0 }, // E
        { dx:  0, dy:  1 }, // S
        { dx: -1, dy:  0 }  // O
    ];

    const dirPriority = (dx, dy) => {
        if (dx === 1 && dy === 0) return 0;  // E
        if (dx === 0 && dy === 1) return 1;  // S
        if (dx === -1 && dy === 0) return 2; // O
        if (dx === 0 && dy === -1) return 3; // N
        return 4;
    };

    // Candidats SH autour de la source (orthogonal uniquement)
    let shSpots = [];
    for (const { dx, dy } of orthoDirs) {
        const x = source.pos.x + dx;
        const y = source.pos.y + dy;
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        const terrain = room.lookForAt(LOOK_TERRAIN, x, y);
        if (terrain.length && terrain[0] !== 'wall') {
            shSpots.push({ x, y, dx, dy });
        }
    }

    // Tri : priorité distance au spawn PUIS ordre directionnel
    shSpots.sort((a, b) => {
        const distA = spawn.pos.getRangeTo(a.x, a.y);
        const distB = spawn.pos.getRangeTo(b.x, b.y);
        if (distA !== distB) return distA - distB;
        return dirPriority(a.dx, a.dy) - dirPriority(b.dx, b.dy);
    });

    const shSpot = shSpots[0];
    if (!shSpot) return {};

    // Container : orthogonal autour du SH, à distance 2 de la source, et aligné
    let containerSpot = null;
    for (const { dx, dy } of orthoDirs) {
        const x = shSpot.x + dx;
        const y = shSpot.y + dy;
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        const terrain = room.lookForAt(LOOK_TERRAIN, x, y);
        if (terrain.length && terrain[0] !== 'wall') {
            const manhattan = Math.abs(source.pos.x - x) + Math.abs(source.pos.y - y);
            const isAligned = (source.pos.x === x || source.pos.y === y);
            if (manhattan === 2 && isAligned) {
                containerSpot = { x, y };
                break;
            }
        }
    }

    return { shSpot, containerSpot };
}


module.exports = {
    getClosestByPath,
    moveTo,
    findContainerNear,
    logError,
    shouldBuildRepairer,
    shouldBuildFiller,
    shouldIncludeRole,
    isContainerProperlyPlaced,
    goToParking,
    getFreeSpacesAroundSource,
    getEmptySpotsAround,
    getAvailableSuperHarvesterContainers,
    assignMiningSlot,
    assignSuperHarvesterSlot,
    assignMiningSlotFromMemory,
    releaseMiningSlot,
    smartMiningMoveAndAction,
    initMiningSlots,
    releaseMiningSlotIfLeft,
    getSuperHarvesterSpotAndContainer
};
