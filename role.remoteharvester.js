module.exports = {
    run: function(creep) {
        // Aller dans la remote room si besoin
        if (creep.room.name !== creep.memory.targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {reusePath: 10});
            return;
        }

        let source = Game.getObjectById(creep.memory.sourceId);
        let container = Game.getObjectById(creep.memory.containerId);

        // Si pas plein, mine la source
        if (creep.store.getFreeCapacity() > 0) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {reusePath: 10});
            }
        }
        // Si plein, dépose dans le container (ou si déjà dessus, attends de vider)
        else {
            if (creep.transfer(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {reusePath: 10});
            }
        }
    }
};

/* MANUAL SPAWN
Game.spawns['Spawn1'].spawnCreep(
    [WORK, WORK, CARRY, MOVE, MOVE],
    '🌐⛏️1003',
    {
        memory: {
            role: 'remoteHarvester',
            targetRoom: 'E28S16',
            sourceId: '6845d068b4a6e60029b24f42',
            containerId: '684d6a4be189a20028779a11'
        }
    }
);
*/