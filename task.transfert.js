var Transfer = {
    run: function(creep) {
        // Si une tâche prioritaire apparaît, abandonner la tâche courante et repasser par le dispatch
        if (require('role.worker').needDeposit(creep.room)) {
            creep.memory.task = 'idle';
            creep.memory.transferTargetId = null; // Nettoyage de la cible
            return;
        }

        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = 'idle';
            creep.memory.transferTargetId = null; // Nettoyage de la cible
            return;
        }

        var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        if (target) {
            creep.memory.transferTargetId = target.id; // Mémorisation pour les logs
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
                creep.say('transfer');
            }
        } else {
            creep.memory.task = 'idle'; // Nettoyage si pas de cible
        }
    }
};

module.exports = Transfer;
