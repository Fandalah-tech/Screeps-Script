const {
    assignSuperHarvesterSlot,
    releaseMiningSlotIfLeft,
    smartMiningMoveAndAction
} = require('module.utils');

module.exports = {
    run: function(creep) {
        releaseMiningSlotIfLeft(creep);

        // 📌 Affectation initiale si rien en mémoire
        if (!creep.memory.mining || !creep.memory.mining.targetPos || !creep.memory.sourceId) {
            assignSuperHarvesterSlot(creep);
        }

        smartMiningMoveAndAction(creep, {
            timeout: 10,
            allowTransfer: true,
            allowPark: false
        });
    }
};
