// module.body_manager.js (refonte optimisée)

const BODYPART_COST_TOTAL = body => body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

const basicBodies = {
    harvester:    [WORK, CARRY, MOVE],
    upgrader:     [WORK, CARRY, MOVE],
    builder:      [WORK, CARRY, MOVE],
    repairer:     [WORK, CARRY, MOVE],
    transporter:  [CARRY, CARRY, MOVE],
    superharvester: [WORK, WORK, CARRY, MOVE],
    filler:       [CARRY, MOVE],
    remoteharvester: [WORK, WORK, CARRY, MOVE],
    remotebuilder:   [WORK, CARRY, MOVE],
    remotetransporter: [CARRY, CARRY, MOVE],
};

function getBestBody(role, energyAvailable) {
    const template = basicBodies[role];
    if (!template) return [WORK, CARRY, MOVE];

    let body = [...template];
    let cost = BODYPART_COST_TOTAL(body);

    // Reproduction du template tant que possible
    while (true) {
        const next = [...body, ...template];
        const nextCost = BODYPART_COST_TOTAL(next);
        if (nextCost > energyAvailable || next.length >= 50) break;
        body = next;
        cost = nextCost;
    }

    // Optimisation légère des transporteurs pour grande distance
    if (role.includes('transporter') && energyAvailable >= 300) {
        body = [];
        const partCount = Math.min(Math.floor(energyAvailable / 50), 30);
        for (let i = 0; i < partCount; i++) {
            body.push(i % 2 === 0 ? CARRY : MOVE);
        }
    }

    return body;
}

module.exports = {
    getBestBody
};
