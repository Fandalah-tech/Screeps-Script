const WALL_REMPART_REPAIR_CAP = 10000;

var Repair = {
    run: function(creep) {
        // Si plus d'énergie, stoppe la tâche repair
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = null;
            creep.memory.repairTargetId = null;
            return;
        }

        // Recherche d'une cible à réparer si besoin
        if (!creep.memory.repairTargetId) {
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
                        return structure.hits < structure.hitsMax * 0.5;
                    }
                    if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                        return structure.hits < WALL_REMPART_REPAIR_CAP;
                    }
                    return false;
                }
            });

            if (targets.length > 0) {
                let target = _.min(targets, s => s.hits);
                creep.memory.repairTargetId = target.id;
            } else {
                // PATCH : plus rien à réparer, repasse en tâche nulle
                creep.memory.task = null;
                creep.memory.repairTargetId = null;
                return;
            }
        }

        // Récupère la cible
        let target = Game.getObjectById(creep.memory.repairTargetId);

        // Vérifie si la cible est toujours valide
        if (
            !target ||
            target.hits === undefined ||
            target.hits === target.hitsMax ||
            (
                (target.structureType === STRUCTURE_WALL || target.structureType === STRUCTURE_RAMPART) &&
                target.hits >= WALL_REMPART_REPAIR_CAP
            )
        ) {
            // PATCH : la cible n'est plus valable, reset la tâche
            creep.memory.repairTargetId = null;
            creep.memory.task = null;
            return;
        }

        // Répare ou se déplace
        let repairResult = creep.repair(target);
        if (repairResult === ERR_INVALID_TARGET) {
            creep.memory.repairTargetId = null;
            creep.memory.task = null;
            return;
        }
        if (repairResult === ERR_NOT_IN_RANGE) {
            let moveResult = creep.moveTo(target, {visualizePathStyle: {stroke: '#a9a9a9'}});
            // Détection simple de blocage sur la route
            if (!creep.memory.lastRepairPos) creep.memory.lastRepairPos = {};
            if (!creep.memory.stuckCounter) creep.memory.stuckCounter = 0;

            if (creep.memory.lastRepairPos.x === creep.pos.x &&
                creep.memory.lastRepairPos.y === creep.pos.y) {
                creep.memory.stuckCounter++;
            } else {
                creep.memory.stuckCounter = 0;
            }
            creep.memory.lastRepairPos = {x: creep.pos.x, y: creep.pos.y};

            if (creep.memory.stuckCounter > 5) {
                creep.memory.repairTargetId = null;
                creep.memory.task = null;
                creep.memory.stuckCounter = 0;
                return;
            }
        } else {
            creep.memory.stuckCounter = 0;
        }
        
        if (repairResult === OK) {
        creep.say('repair');
        }
    }
};

module.exports = Repair;
