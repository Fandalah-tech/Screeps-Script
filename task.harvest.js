var Harvest = {
    run: function(creep) {
        // LOG DE DEBUG EN EN-TÊTE
        //console.log('[HARVEST DEBUG]', creep.name, '| energy:', creep.store[RESOURCE_ENERGY], '| currentSource:', creep.memory.workingSourceId);

        let sources = creep.room.find(FIND_SOURCES);
        //console.log('[HARVEST DEBUG]', creep.name, '| sources in room:', sources.map(s => `${s.id} [${s.pos.x},${s.pos.y}]`));

        // Nettoie la mémoire si source disparue ou hors room
        if (creep.memory.workingSourceId) {
            let source = Game.getObjectById(creep.memory.workingSourceId);
            if (!source || source.room.name !== creep.room.name) {
                //console.log('[HARVEST DEBUG]', creep.name, '| resetting invalid source', creep.memory.workingSourceId);
                creep.memory.workingSourceId = null;
            }
        }

        // Si aucune source assignée, attribue la moins saturée
        if (!creep.memory.workingSourceId) {
            if (sources.length === 0) {
                //console.log('[HARVEST DEBUG]', creep.name, '| NO SOURCES in room:', creep.room.name);
                creep.memory.task = null;
                return;
            }
            let bestSource = null;
            let minAssigned = Infinity;
            for (let source of sources) {
                let assigned = _.sum(Game.creeps, c =>
                    c.memory.task === 'harvest' && c.memory.workingSourceId === source.id ? 1 : 0
                );
                //console.log('[HARVEST DEBUG]', creep.name, '| source', source.id, 'has', assigned, 'creeps assigned');
                if (assigned < minAssigned) {
                    minAssigned = assigned;
                    bestSource = source;
                }
            }
            if (bestSource) {
                creep.memory.workingSourceId = bestSource.id;
                //console.log('[HARVEST DEBUG]', creep.name, '| assigned source', bestSource.id);
            } else {
                creep.memory.workingSourceId = sources[0].id;
                //console.log('[HARVEST DEBUG]', creep.name, '| fallback to first source', sources[0].id);
            }
        }

        let source = Game.getObjectById(creep.memory.workingSourceId);
        if (!source) {
            //console.log('[HARVEST DEBUG]', creep.name, '| ERROR source object not found', creep.memory.workingSourceId);
            creep.memory.workingSourceId = null;
            return;
        }

        let res = creep.harvest(source);
        if (res === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            creep.say('harvest');
        } else if (res !== OK) {
            //console.log('[HARVEST DEBUG]', creep.name, '| harvest error:', res, 'on', source.id);
            creep.memory.workingSourceId = null;
        }
    }
};
module.exports = Harvest;
