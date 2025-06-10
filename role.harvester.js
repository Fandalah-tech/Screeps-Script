module.exports = {
    run: function(creep) {
        // Si pas plein, va miner
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            let source;
            if (!creep.memory.sourceId) {
                // Assigne une source la plus libre (ou la plus proche au besoin)
                source = creep.pos.findClosestByPath(FIND_SOURCES);
                if (source) creep.memory.sourceId = source.id;
            } else {
                source = Game.getObjectById(creep.memory.sourceId);
            }
            if (source) {
                if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        } else {
            // Si un container est adjacent à la source et vide, on remplit le container (version PRO)
            let container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                             s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            })[0];

            if (container) {
                if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Sinon, fallback : remplit spawn/extensions
                let targets = creep.room.find(FIND_STRUCTURES, {
                    filter: structure =>
                        (structure.structureType === STRUCTURE_EXTENSION ||
                         structure.structureType === STRUCTURE_SPAWN) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (targets.length > 0) {
                    if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                }
            }
        }
    }
};
