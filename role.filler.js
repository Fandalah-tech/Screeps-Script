const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        // Machine d'état très simple : "recharge" ou "remplit"
        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.memory.energyTargetId = undefined;
        }
        if (!creep.memory.filling && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.filling = true;
        }

        // PHASE DE DÉPÔT (remplir extensions/spawn)
        if (creep.memory.filling) {
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                // Va vers la structure la moins pleine en priorité
                targets.sort((a, b) => a.store[RESOURCE_ENERGY] - b.store[RESOURCE_ENERGY]);
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: "#ffaa00" } });
                }
                return;
            }
            // Si tout est plein, va en parking !
            goToParking(creep, {role: 'filler'});
            return;
        }

        // PHASE DE RECHARGE (uniquement storage)
        let storages = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0
        });
        if (storages.length > 0) {
            if (creep.withdraw(storages[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storages[0], { visualizePathStyle: { stroke: "#aaffaa" } });
            }
            return;
        }

        // Pickup energy au sol si storage vide
        let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: res => res.resourceType === RESOURCE_ENERGY
        });
        if (dropped.length > 0) {
            if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped[0], { visualizePathStyle: { stroke: "#ffaa00" } });
            }
            return;
        }

        // Sinon, park !
        goToParking(creep, {role: 'filler'});
    }
};
