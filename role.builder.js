module.exports = {
    run: function(creep, recoveryMode) {

        // Mode construction/charge
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.building = true;
        }

        // === PHASE BUILD ===
        if (creep.memory.building) {
            let targetSite = null;

            // Recherche chantier mémorisé ou nouveau
            if (creep.memory.buildSiteId) {
                let currentSite = Game.getObjectById(creep.memory.buildSiteId);
                if (currentSite) {
                    if (
                        currentSite.structureType !== STRUCTURE_CONTAINER &&
                        creep.room.find(FIND_CONSTRUCTION_SITES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length > 0
                    ) {
                        creep.memory.buildSiteId = null;
                    } else {
                        targetSite = currentSite;
                    }
                } else {
                    creep.memory.buildSiteId = null;
                }
            }
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
                        creep.memory.buildSiteId = targetSite.id;
                        break;
                    }
                }
            }
            if (targetSite) {
                if (creep.build(targetSite) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetSite, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            } else {
                // Pas de chantier, switch en upgrader ET nettoie la mémoire builder
                creep.say('⚡ upgrade');
                creep.memory.role = 'upgrader';
                creep.memory.building = undefined;
                creep.memory.buildSiteId = undefined;
                creep.memory.energyTargetId = undefined;
                return;
            }
            return;
        }

        // === PHASE RECHARGE BUILDER ===

        // Récupère tous les containers dans la room
        let containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
        let totalCapacity = containers.reduce((sum, c) => sum + c.store.getCapacity(RESOURCE_ENERGY), 0);
        let totalStored   = containers.reduce((sum, c) => sum + c.store[RESOURCE_ENERGY], 0);
        let containersEmptyOrLow = (containers.length === 0) || (totalStored < 0.10 * totalCapacity);

        // *** Builder peut piocher dans spawn/extensions SEULEMENT en recovery ET containers vides/absents ***
        let canWithdrawFromSpawn = (!recoveryMode) || (recoveryMode && containersEmptyOrLow);

        // Sélection de la cible de recharge
        if (!creep.memory.energyTargetId) {
            let containerTargets = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
            });
            let storageTargets = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
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
            // Scoring
            let scored = [];
            containerTargets.forEach(container => {
                let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == container.id);
                scored.push({
                    target: container,
                    score: container.store[RESOURCE_ENERGY] - assigned * 50
                });
            });
            storageTargets.forEach(storage => {
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
        // Reset si cible interdite ou vide
        if (
            (!canWithdrawFromSpawn && target && (target.structureType === STRUCTURE_SPAWN || target.structureType === STRUCTURE_EXTENSION))
        ) {
            creep.memory.energyTargetId = undefined;
            target = null;
        }

        // Si la cible est invalide ou vide, essaie de prendre au spawn/extensions si recovery possible
        if (!target || (target.store && target.store[RESOURCE_ENERGY] === 0)) {
            creep.memory.energyTargetId = undefined;
            // Ramasse énergie tombée si présente
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                }
                return;
            }
            // Dernière chance, tenter la pioche “même petit montant” au spawn/extensions si c’est permis
            if (canWithdrawFromSpawn) {
                let possibleSpawns = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_EXTENSION ||
                         s.structureType === STRUCTURE_SPAWN) &&
                        s.store[RESOURCE_ENERGY] > 0
                });
                if (possibleSpawns.length > 0) {
                    if (creep.withdraw(possibleSpawns[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(possibleSpawns[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                    return;
                }
            }
            return;
        }
        // Withdraw classique
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
    }
};
