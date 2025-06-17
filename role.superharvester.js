// role.superharvester.js
const { assignMiningSlot, goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        // Vérifie qu'il a du WORK (sinon, park)
        if (creep.getActiveBodyparts(WORK) === 0) {
            creep.say('❌ no WORK');
            goToParking(creep, { role: 'superharvester' });
            return;
        }

        // Attribution d'un slot optimal autour d'une source
        if (!creep.memory.sourceId || !creep.memory.targetPos) {
            const slotAssigned = assignMiningSlot(creep, ['superharvester']);
            if (!slotAssigned) {
                creep.say('❌ no slot');
                goToParking(creep, { role: 'superharvester' });
                return;
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        // Se déplacer sur le slot assigné
        if (!creep.pos.isEqualTo(targetPos)) {
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#00ff00' } });
            return;
        }

        // Cherche s'il y a un container sous les pieds
        const structures = creep.pos.lookFor(LOOK_STRUCTURES);
        const container = structures.find(s => s.structureType === STRUCTURE_CONTAINER);

        if (container && creep.store[RESOURCE_ENERGY] > 0) {
            creep.transfer(container, RESOURCE_ENERGY);
        } else if (!container && creep.store[RESOURCE_ENERGY] > 0) {
            // Si pas de container, drop au sol (early game)
            creep.drop(RESOURCE_ENERGY);
        }

        // Mine la source
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
    }
};
