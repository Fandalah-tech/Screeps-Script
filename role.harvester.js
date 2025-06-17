const { goToParking, getFreeSpacesAroundSource } = require('module.utils');

module.exports = {
    run: function(creep) {
        // Nouvelle attribution avec vérification des slots libres
        if (!creep.memory.sourceId || !creep.memory.targetPos) {
            const sources = creep.room.find(FIND_SOURCES);
            for (let source of sources) {
                const spots = getFreeSpacesAroundSource(source);
                for (let pos of spots) {
                    const taken = _.some(Game.creeps, c =>
                        c.name !== creep.name &&
                        (c.memory.role === 'harvester' || c.memory.role === 'superharvester') &&
                        c.memory.targetPos &&
                        c.memory.targetPos.x === pos.x &&
                        c.memory.targetPos.y === pos.y &&
                        c.memory.sourceId === source.id
                    );
                    if (!taken) {
                        creep.memory.sourceId = source.id;
                        creep.memory.targetPos = { x: pos.x, y: pos.y, roomName: source.room.name };
                        break;
                    }
                }
                if (creep.memory.sourceId) break;
            }
        }

        if (!creep.memory.sourceId || !creep.memory.targetPos) {
            creep.say('❌ no slot');
            goToParking(creep, { role: 'harvester' });
            return;
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        if (!creep.pos.isEqualTo(targetPos)) {
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // HARVEST + drop
        if (creep.store.getFreeCapacity() === 0) {
            creep.drop(RESOURCE_ENERGY);
            return;
        }

        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
