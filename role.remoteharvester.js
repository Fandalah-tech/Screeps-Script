// role.remoteharvester.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.sourceId || !creep.memory.containerId) {
            // Recherche d'une source avec un container construit dans remote room
            const targetRoom = Game.rooms[creep.memory.remoteRoom];
            if (!targetRoom) return creep.moveTo(new RoomPosition(25, 25, creep.memory.remoteRoom));

            const containers = targetRoom.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            for (let container of containers) {
                const sources = container.pos.findInRange(FIND_SOURCES, 1);
                if (sources.length > 0) {
                    const taken = _.some(Game.creeps, c =>
                        c.name !== creep.name &&
                        c.memory.role === 'remoteharvester' &&
                        c.memory.containerId === container.id
                    );
                    if (!taken) {
                        creep.memory.sourceId = sources[0].id;
                        creep.memory.containerId = container.id;
                        break;
                    }
                }
            }

            if (!creep.memory.containerId) {
                goToParking(creep, { role: 'remoteharvester' });
                return;
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        const container = Game.getObjectById(creep.memory.containerId);

        if (!source || !container) {
            delete creep.memory.sourceId;
            delete creep.memory.containerId;
            return;
        }

        if (!creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, { visualizePathStyle: { stroke: '#00ff88' } });
            return;
        }

        creep.harvest(source);
    }
};
