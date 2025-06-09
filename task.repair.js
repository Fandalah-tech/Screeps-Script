const WALL_REMPART_REPAIR_CAP = 10000;    // HP max pour un rampart neuf/à boost
const WALL_REMPART_MAINTAIN_MIN = 2000;   // Seuil de maintenance courant

module.exports = {
    run: function(creep) {
        // 1. Si pas de cible mémorisée ou cible invalide, cherche-en une nouvelle
        if (!creep.memory.repairTargetId) {
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    // 1. Priorité : routes ou containers très abîmés (< 50%)
                    if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) {
                        return structure.hits < structure.hitsMax * 0.5;
                    }
                    // 2. Ramparts/Walls : maintenance seulement sous le seuil critique
                    if (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL) {
                        // Si tout neuf (< 10k ou < 20% max), on boost
                        if (structure.hits < WALL_REMPART_REPAIR_CAP && structure.hits < structure.hitsMax * 0.2) return true;
                        // Sinon, seulement si descend sous le seuil maintenance
                        if (structure.hits < WALL_REMPART_MAINTAIN_MIN) return true;
                        // Sinon, non prioritaire
                        return false;
                    }
                    // 3. Ajoute d'autres structures si besoin (tower, etc.)
                    return false;
                }
            });

            // Sélectionne la structure la plus abîmée
            if (targets.length > 0) {
                let target = _.min(targets, t => t.hits / t.hitsMax);
                creep.memory.repairTargetId = target.id;
            } else {
                creep.memory.repairTargetId = null;
                creep.memory.task = 'idle'; // Plus rien à réparer
                return;
            }
        }

        // 2. Action de repair
        let target = Game.getObjectById(creep.memory.repairTargetId);
        if (!target) {
            creep.memory.repairTargetId = null; // Cible disparue
            creep.memory.task = 'idle';
            return;
        }

        // Si la cible est déjà réparée, on cherche une nouvelle tâche au prochain tick
        if (target.hits >= target.hitsMax ||
            (target.structureType === STRUCTURE_RAMPART || target.structureType === STRUCTURE_WALL) && 
                target.hits >= WALL_REMPART_REPAIR_CAP) {
            creep.memory.repairTargetId = null;
            creep.memory.task = 'idle';
            return;
        }

        // Déplacement et repair
        if (creep.pos.inRangeTo(target, 3)) {
            creep.say('repair');
            creep.repair(target);
        } else {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
