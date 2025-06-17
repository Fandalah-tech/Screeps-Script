// role.harvester.js
const { assignMiningSlot, goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        // Attribution d'un slot optimal si besoin
        if (!creep.memory.sourceId || !creep.memory.targetPos) {
            const slotAssigned = assignMiningSlot(creep);
            if (!slotAssigned) {
                creep.say('❌ no slot');
                goToParking(creep, { role: 'harvester' });
                return;
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        // Se déplacer vers le slot assigné
        if (!creep.pos.isEqualTo(targetPos)) {
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // Harvest puis drop au sol (méta early game)
        if (creep.store.getFreeCapacity() === 0) {
            creep.drop(RESOURCE_ENERGY);
            return;
        }

        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
