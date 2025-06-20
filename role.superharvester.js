const {
    assignSuperHarvesterSlot,
    releaseMiningSlotIfLeft,
    smartMiningMoveAndAction
} = require('module.utils');

module.exports = {
    run: function(creep) {
        releaseMiningSlotIfLeft(creep);

        if (!creep.memory.mining || !creep.memory.mining.targetPos || !creep.memory.sourceId) {
            assignSuperHarvesterSlot(creep);
        }

        // Harvesting logic
        smartMiningMoveAndAction(creep, {
            timeout: 10,
            allowTransfer: true,
            allowPark: false
        });

        // === Patch: Transfert énergie ===
        const container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];
        if (
            container &&
            creep.store[RESOURCE_ENERGY] > 0 &&
            creep.pos.getRangeTo(container) === 1
        ) {
            creep.transfer(container, RESOURCE_ENERGY);
        }
    }
};
