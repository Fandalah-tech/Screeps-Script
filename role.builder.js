module.exports = {
    run: function(creep, quota_max) {
        quota_max = quota_max || 8;

        // On bascule le mode si on est vide ou plein
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.building = true;
        }

        // === PHASE BUILD ===
        if (creep.memory.building) {
            let targetSite = null;

            // 1. Si on a déjà une cible en mémoire, la retrouver
            if (creep.memory.buildSiteId) {
                let currentSite = Game.getObjectById(creep.memory.buildSiteId);
                // On vérifie la priorité du chantier courant
                if (currentSite) {
                    // Si ce n'est PAS un container ET qu'il existe un chantier container en cours,
                    // on switche la priorité tout de suite !
                    if (
                        currentSite.structureType !== STRUCTURE_CONTAINER &&
                        creep.room.find(FIND_CONSTRUCTION_SITES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length > 0
                    ) {
                        creep.memory.buildSiteId = null; // On oublie la cible courante
                    } else {
                        targetSite = currentSite;
                    }
                } else {
                    creep.memory.buildSiteId = null; // le chantier n'existe plus
                }
            }

            // 2. Si aucune cible valide, recherche dans l'ordre de priorité habituel
            if (!targetSite) {
                const buildOrder = [
                    STRUCTURE_EXTENSION,
                    STRUCTURE_TOWER,
                    STRUCTURE_RAMPART,
                    STRUCTURE_STORAGE,
                    STRUCTURE_CONTAINER,
                    STRUCTURE_ROAD,
                    STRUCTURE_WALL
                ];
                for (let type of buildOrder) {
                    targetSite = creep.room.find(FIND_CONSTRUCTION_SITES, {
                        filter: site => site.structureType === type
                    })[0];
                    if (targetSite) {
                        // On mémorise le nouveau chantier
                        creep.memory.buildSiteId = targetSite.id;
                        break;
                    }
                }
            }

            // 3. Si on a une cible, on construit
            if (targetSite) {
                if (creep.build(targetSite) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetSite, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Aucun chantier : on switche upgrader
                creep.memory.role = 'upgrader';
            }
            return;
        }

        // === PHASE RECHARGE (PRO) ===
        let totalCreeps = Object.keys(Game.creeps).length;
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: structure =>
                (structure.structureType === STRUCTURE_EXTENSION ||
                 structure.structureType === STRUCTURE_SPAWN) &&
                structure.store[RESOURCE_ENERGY] > 0
        });

        if (totalCreeps >= quota_max && targets.length > 0) {
            // Peut withdraw dans le stock centralisé
            if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            // NE PAS miner : ramasser énergie tombée s’il y en a
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            // Sinon, attend… ou ajoute un idle/timer si tu veux éviter du “pathing inutile”
        }
    }
};
