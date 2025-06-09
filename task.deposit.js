// task.deposit.js
// Gère le dépôt d'énergie dans spawn/extensions/tower

var Deposit = {
    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.task = 'idle';
            creep.memory.depositTargetId = null; // Nettoyage de la cible
            return;
        }

        // Cherche un bâtiment à remplir
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_EXTENSION ||
                 structure.structureType === STRUCTURE_SPAWN ||
                 structure.structureType === STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (targets.length > 0) {
            // Va remplir le plus proche
            creep.memory.depositTargetId = targets[0].id; // Mémorisation pour les logs
            if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                creep.say('deposit');
            }
        } else {
            // Plus rien à déposer, on laisse le dispatch ré-attribuer une tâche prioritaire
            creep.memory.task = 'idle';
            creep.memory.depositTargetId = null;
            return;
        }
    }
};
module.exports = Deposit;
