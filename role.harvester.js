const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep, recoveryMode) {
        // PHASE DE MINAGE CLASSIQUE
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            let source;
            if (!creep.memory.sourceId) {
                source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
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
            // Dépose d'abord dans extensions/spawn, puis container sinon
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_SPAWN) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Si pas de place, dépose dans container à portée 1 (sécurité)
                let containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER &&
                                 s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (containers.length > 0) {
                    creep.transfer(containers[0], RESOURCE_ENERGY);
                } else {
                    goToParking(creep, {role: 'harvester'});
                }
            }
        }

        // --- Suicide si vraiment plus utile (optionnel) ---
        if (
            _.sum(Game.creeps, c => c.memory.role == 'transporter') > 1 &&
            _.sum(Game.creeps, c => c.memory.role == 'superharvester') > 1 &&
            creep.ticksToLive < 500
        ) {
            creep.suicide();
            return;
        }
    }
};
