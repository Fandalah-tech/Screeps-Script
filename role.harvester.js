const { smartMiningMoveAndAction } = require('module.utils');

module.exports = {
    run(creep) {
        smartMiningMoveAndAction(creep, {
            timeout: 5,
            dropIfNoContainer: true,
            transferIfContainer: true
        });
    }
};
