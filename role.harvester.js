const { smartMiningMoveAndAction } = require('module.utils');

module.exports = {
    run(creep) {
        // Vérifie si je squatte un slot SH alors qu'un vrai superharvester existe sur ce slot
        if (creep.memory.targetPos) {
            const isOnSHSlot = Memory.miningSlots &&
                Memory.miningSlots[creep.room.name] &&
                Memory.miningSlots[creep.room.name].some(slot =>
                    slot.x === creep.memory.targetPos.x &&
                    slot.y === creep.memory.targetPos.y &&
                    slot.role === 'superharvester'
                );
            
            if (isOnSHSlot) {
                const sh = _.find(Game.creeps, c =>
                    c.memory.role === 'superharvester' &&
                    c.memory.targetPos &&
                    c.memory.targetPos.x === creep.memory.targetPos.x &&
                    c.memory.targetPos.y === creep.memory.targetPos.y
                );
                if (sh) {
                    // Je libère le slot immédiatement et je vais me garer ailleurs
                    creep.memory.targetPos = undefined;
                    creep.memory.sourceId = undefined;
                    creep.memory.mining = undefined;
                    if (creep.say) creep.say('⛔ SH!');
                    // Option : aller se parker
                    const { goToParking } = require('module.utils');
                    goToParking(creep, { role: 'harvester' });
                    return;
                }
            }
        }

        smartMiningMoveAndAction(creep, {
            timeout: 5,
            dropIfNoContainer: true,
            transferIfContainer: true
        });
    }
};
