const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        // 1. Recharge si vide
        if (creep.store[RESOURCE_ENERGY] === 0) {
            // Si pas dans la remote, va chercher l'énergie dans la main room
            if (!creep.memory.targetRoom || creep.room.name !== creep.memory.targetRoom) {
                let source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s =>
                        (s.structureType === STRUCTURE_STORAGE ||
                         s.structureType === STRUCTURE_CONTAINER ||
                         s.structureType === STRUCTURE_SPAWN ||
                         s.structureType === STRUCTURE_EXTENSION) &&
                        s.store && s.store[RESOURCE_ENERGY] > 0
                });
                if (source) {
                    if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                    return;
                }
                // Sinon, park dans la main room
                goToParking(creep, {role: 'remotebuilder'});
                return;
            }

            // Si dans la remote : container, dropped
            let containers = creep.room.find(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) && s.store[RESOURCE_ENERGY] > 0
            });
            let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: res => res.resourceType === RESOURCE_ENERGY
            });
            if (containers.length > 0) {
                if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(containers[0]);
                }
                return;
            }
            if (dropped.length > 0) {
                if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped[0]);
                }
                return;
            }
            // Rien à faire, park dans la remote
            goToParking(creep, {role: 'remotebuilder'});
            return;
        }

        // 2. Si plein, va dans la remote
        if (creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {reusePath: 10});
            return;
        }

        // 3. Si dans la remote et plein, build ce que tu trouves
        let sites = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length > 0) {
            sites.sort((a, b) => {
                if (a.structureType === STRUCTURE_CONTAINER && b.structureType !== STRUCTURE_CONTAINER) return -1;
                if (a.structureType !== STRUCTURE_CONTAINER && b.structureType === STRUCTURE_CONTAINER) return 1;
                if (a.structureType === STRUCTURE_ROAD && b.structureType !== STRUCTURE_ROAD) return -1;
                if (a.structureType !== STRUCTURE_ROAD && b.structureType === STRUCTURE_ROAD) return 1;
                return 0;
            });
            creep.memory.buildSiteId = sites[0].id;
            if (creep.build(sites[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sites[0], {reusePath: 10});
            }
            return;
        }

        // 4. Si rien à construire, park dans la remote
        goToParking(creep, {role: 'remotebuilder'});
        if (sites.length === 0) {
            delete creep.memory.buildSiteId;
            goToParking(creep, {role: 'remotebuilder'});
            return;
        }
    }
};


/*
Game.spawns['Spawn1'].spawnCreep(
    [WORK, CARRY, MOVE, MOVE],
    'RB-1003',
    {memory: {role: 'remoteBuilder', targetRoom: 'E28S16'}}
);
*/