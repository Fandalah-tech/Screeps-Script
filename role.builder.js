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

        // === PHASE RECHARGE SECURE & BALANCED ===
        
        let numHarvesters = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester');
        let numSuperHarvester = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
        let safeHarvesterCount = numHarvesters + numSuperHarvester;
        let quota_min_harvester = 3; // adapte à ta logique
        
        let canWithdrawFromSpawn = (safeHarvesterCount >= quota_min_harvester);
        
        // Sélection de la cible uniquement si pas déjà mémorisée ou si cible plus valide
        if (!creep.memory.energyTargetId) {
            let containers = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] > 0
            });
            let storages = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_STORAGE &&
                    s.store[RESOURCE_ENERGY] > 0
            });
            let spawnsExtensions = [];
            if (canWithdrawFromSpawn) {
                spawnsExtensions = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_EXTENSION ||
                         s.structureType === STRUCTURE_SPAWN) &&
                        s.store[RESOURCE_ENERGY] > 0
                });
            }
        
            // Charge balancing sur containers
            let scored = [];
            containers.forEach(container => {
                let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == container.id);
                scored.push({
                    target: container,
                    score: container.store[RESOURCE_ENERGY] - assigned * 50 // 50 = poids d'un creep assigné (ajuste si besoin)
                });
            });
            storages.forEach(storage => {
                let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == storage.id);
                scored.push({
                    target: storage,
                    score: storage.store[RESOURCE_ENERGY] - assigned * 50
                });
            });
            spawnsExtensions.forEach(sx => {
                let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == sx.id);
                scored.push({
                    target: sx,
                    score: (sx.store ? sx.store[RESOURCE_ENERGY] : 0) - assigned * 50
                });
            });
        
            if (scored.length > 0) {
                scored.sort((a, b) => b.score - a.score);
                if (scored[0].score > 0) {
                    creep.memory.energyTargetId = scored[0].target.id;
                }
            }
        }
        
        // Utilisation de la cible mémorisée
        let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;
        
        // Si la cible est invalide (disparue, vide...), on efface la mémoire pour un nouveau calcul la prochaine fois
        if (!target ||
            (target.store && target.store[RESOURCE_ENERGY] === 0)) {
            creep.memory.energyTargetId = undefined;
            // Option : ramasse énergie tombée avant de repartir
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            return; // attend le prochain tick pour recalculer une nouvelle cible
        }
        
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }

    }
};