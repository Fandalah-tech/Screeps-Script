module.exports = {
    run: function(creep) {
        // Remplir d'abord, puis ramener à la base
        // Aller à la remote si vide et pas déjà sur place
        if (creep.store.getFreeCapacity() > 0 && creep.room.name !== creep.memory.targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {reusePath: 20});
            return;
        }
        // Dans la remote, cherche à retirer l'énergie du container
        if (creep.store.getFreeCapacity() > 0 && creep.room.name === creep.memory.targetRoom) {
            let container = Game.getObjectById(creep.memory.containerId);
        if (container && container.store && container.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {reusePath: 10});
            }
        } else if (container) {
            // Si le container est vide, attend sur place pour le remplir
            creep.moveTo(container, {reusePath: 10});
        } else {
            // Container introuvable, park ou moveTo le point central
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom));
        }
            return;
        }
        // Si plein, retourne à la home room
        if (creep.store.getFreeCapacity() === 0 && creep.room.name !== creep.memory.homeRoom) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.homeRoom), {reusePath: 20});
            return;
        }
        // Déposer dans le storage (ou container home si pas de storage)
        if (creep.room.name === creep.memory.homeRoom) {
            let storage = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE
            })[0];
            // Fallback : container principal si pas de storage
            if (!storage) {
                storage = creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })[0];
            }
            if (storage) {
                if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {reusePath: 10});
                }
            } else {
                // Pas de storage/container, park en base
                creep.moveTo(25, 25, creep.memory.homeRoom);
            }
            return;
        }
    }
};

/* MANUAL SPAWN
Game.spawns['Spawn1'].spawnCreep(
    [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
    '🌐🚚1003',
    {
        memory: {
            role: 'remoteTransporter',
            targetRoom: 'E28S16',
            containerId: '684d6a4be189a20028779a11',
            homeRoom: 'E29S16'
        }
    }
);

*/