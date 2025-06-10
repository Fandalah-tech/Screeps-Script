function getBestSource(creep) {
    let sources = creep.room.find(FIND_SOURCES);
    // Pour chaque source, compte les assignations MEMOIRE
    let counts = {};
    for (let source of sources) {
        counts[source.id] = 0;
    }
    for (let cName in Game.creeps) {
        let c = Game.creeps[cName];
        if (c.memory.sourceId && counts[c.memory.sourceId] !== undefined) {
            counts[c.memory.sourceId]++;
        }
    }

    // On choisit la source la moins assignée
    let bestSource = null;
    let min = Infinity;
    for (let source of sources) {
        if (counts[source.id] < min) {
            min = counts[source.id];
            bestSource = source;
        }
    }

    // S'il y a une source assignée valide, on la garde (sauf si pleine)
    if (creep.memory.sourceId) {
        let s = Game.getObjectById(creep.memory.sourceId);
        if (s) return s;
    }
    // Sinon, on mémorise la nouvelle assignation
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
            let x = source.pos.x + dx;
            let y = source.pos.y + dy;
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            let terrain = source.room.lookForAt(LOOK_TERRAIN, x, y)[0];
            if (terrain === 'plain' || terrain === 'swamp') {
                free++;
            }
        }
    }
    return free;
}

module.exports = {
    getFreeSpacesAroundSource,
    getBestSource
};
