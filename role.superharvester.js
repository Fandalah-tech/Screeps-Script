// role.superharvester.js
const { getFreeSpacesAroundSource, goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        // Si le creep n'a pas de WORK, il est inutile
        if (creep.getActiveBodyparts(WORK) === 0) {
            creep.say('❌ no WORK');
            goToParking(creep, { role: 'superharvester' });
            return;
        }

        // Assign source + position
        if (!creep.memory.sourceId || !creep.memory.targetPos) {
            const sources = creep.room.find(FIND_SOURCES);
            for (let source of sources) {
                const spots = getFreeSpacesAroundSource(source);
                for (let pos of spots) {
                    const taken = _.some(Game.creeps, c =>
                        c.name !== creep.name &&
                        c.memory.role === 'superharvester' &&
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
            goToParking(creep, { role: 'superharvester' });
            return;
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        if (!creep.pos.isEqualTo(targetPos)) {
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#00ff00' } });
            return;
        }

        // Harvest si sur position et source valide
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
