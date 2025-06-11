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
                    STRUCTURE_TOWER,
                    STRUCTURE_EXTENSION,
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

        // === PHASE RECHARGE SECURE ===
        
        // === PHASE RECHARGE SECURE ===
        
        let numHarvesters = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester');
        let numSuperHarvester = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
        let safeHarvesterCount = numHarvesters + numSuperHarvester;
        let quota_min_harvester = 3; // adapte selon ta logique
        
        let canWithdrawFromSpawn = (safeHarvesterCount >= quota_min_harvester);
        
        // On liste toutes les cibles possibles
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store[RESOURCE_ENERGY] > 0
        });
        let storages = creep.room.find(FIND_STRUCTURES, {
            filter: structure =>
                structure.structureType === STRUCTURE_STORAGE &&
                structure.store[RESOURCE_ENERGY] > 0
        });
        let spawnsExtensions = [];
        if (canWithdrawFromSpawn) {
            spawnsExtensions = creep.room.find(FIND_STRUCTURES, {
                filter: structure =>
                    (structure.structureType === STRUCTURE_EXTENSION ||
                     structure.structureType === STRUCTURE_SPAWN) &&
                    structure.store[RESOURCE_ENERGY] > 0
            });
        }
        
        // On cherche le container/storage le plus plein
        let best = null;
        if (containers.length > 0) {
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            best = containers[0];
        }
        if (storages.length > 0) {
            storages.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (!best || storages[0].store[RESOURCE_ENERGY] > best.store[RESOURCE_ENERGY]) {
                best = storages[0];
            }
        }
        if (!best && spawnsExtensions.length > 0) {
            // Si tu veux les extensions/spawn en dernier
            best = spawnsExtensions[0];
        }
        
        if (best) {
            if (creep.withdraw(best, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(best, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            // Option : ramasser énergie tombée à proximité
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            // Sinon, idle
        }

    }
};