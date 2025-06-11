module.exports = {
    run: function(creep) {
        // Mode état simple : "remplir" ou "vider"
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.memory.energyTargetId = undefined; // reset cible
        }
        if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.working = true;
        }

        if (!creep.memory.working) {
            // PHASE RECHARGE LOAD BALANCED (withdraw)

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

                let scored = [];
                containers.forEach(container => {
                    let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == container.id);
                    scored.push({
                        target: container,
                        score: container.store[RESOURCE_ENERGY] - assigned * 50
                    });
                });
                storages.forEach(storage => {
                    let assigned = _.sum(Game.creeps, c => c.memory.energyTargetId == storage.id);
                    scored.push({
                        target: storage,
                        score: storage.store[RESOURCE_ENERGY] - assigned * 50
                    });
                });

                if (scored.length > 0) {
                    scored.sort((a, b) => b.score - a.score);
                    if (scored[0].score > 0) {
                        creep.memory.energyTargetId = scored[0].target.id;
                    }
                }
            }

            let target = creep.memory.energyTargetId ? Game.getObjectById(creep.memory.energyTargetId) : null;

            if (!target || (target.store && target.store[RESOURCE_ENERGY] === 0)) {
                creep.memory.energyTargetId = undefined;
                // Option : pickup énergie tombée si rien à withdraw
                let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: res => res.resourceType === RESOURCE_ENERGY
                });
                if (dropped.length > 0) {
                    if (creep.pickup(dropped[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(dropped[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
                return;
            }

            if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        } else {
            // PHASE DELIVERY : dépôt dans extensions/spawn avec priorité
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
                // Bonus : stockage dans storage si extensions/spawn pleins
                let storages = creep.room.find(FIND_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_STORAGE &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (storages.length > 0) {
                    if (creep.transfer(storages[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(storages[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
            }
        }
    }
};
