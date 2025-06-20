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

function getBestBody(role, energyAvailable, opts = {}) {
    const template = basicBodies[role];
    if (!template) return [WORK, CARRY, MOVE];

    const useMax = opts.useMaxEnergy || false;
    const capacity = useMax && opts.energyCapacityAvailable
        ? opts.energyCapacityAvailable
        : energyAvailable;
    
    // Sécurité globale !
    if (!capacity || !Number.isFinite(capacity) || capacity <= 0) {
        console.log(`⚠️ [getBestBody] capacity non valide (${capacity}) pour role=${role}, useMax=${useMax}, opts=${JSON.stringify(opts)}, energyAvailable=${energyAvailable}`);
        return [WORK, CARRY, MOVE];
    }

    // --- SPECIAL CASES ---

    // TRANSPORTER : alternance CARRY/MOVE
    if (role.includes('transporter')) {

        const minBody = [CARRY, MOVE];
        if (capacity < 100) return minBody;

        let parts = Math.floor(capacity / 50);

        // Sécurité globale
        if (!Number.isFinite(parts) || parts < 2) parts = 2;
        if (parts > 50) parts = 50;
        if (parts < 2) parts = 2;
    
        // Diagnostique anti-bug
        if (!Number.isInteger(parts) || parts <= 0 || parts > 50) {
            console.log(`🚨 BUG TRANSPORTER | role: ${role} | capacity: ${capacity} | parts: ${parts} | opts: ${JSON.stringify(opts)} | energyAvailable: ${energyAvailable}`);
            return minBody;
        }
    
        return Array.from({ length: parts }, (_, i) => i % 2 === 0 ? CARRY : MOVE);
    }

    // SUPERHARVESTER : max WORK, 1 CARRY, 1 MOVE
    if (role === 'superharvester') {
        const budget = capacity - BODYPART_COST[CARRY] - BODYPART_COST[MOVE];
        let workCount = Math.min(Math.floor(budget / BODYPART_COST[WORK]), 48);
        if (!Number.isFinite(workCount) || workCount < 1) workCount = 1;
        if (workCount > 48) workCount = 48;
        // LOG ici :
        if (!Number.isInteger(workCount) || workCount < 1 || workCount > 48) {
            console.log(`🚨 BUG SUPERHARVESTER | capacity: ${capacity} | workCount: ${workCount} | role: ${role}`);
            return [WORK, CARRY, MOVE];
        }
        return [...Array(workCount).fill(WORK), CARRY, MOVE];
    }

    // BUILDER/UPGRADER/... : scaling du template
    let body = [...template];
    while (true) {
        // LOG ici aussi :
        if (!Array.isArray(body) || body.length < 1 || body.length > 50) {
            console.log(`🚨 BUG TEMPLATE | role: ${role} | body: ${JSON.stringify(body)} | capacity: ${capacity}`);
            return [WORK, CARRY, MOVE];
        }
        const next = [...body, ...template];
        if (BODYPART_COST_TOTAL(next) > capacity || next.length >= 50) break;
        body = next;
    }

    // SÉCURITÉ : jamais retourner [] (important après un reset)
    return body.length > 0 ? body : [WORK, CARRY, MOVE];
}

module.exports = {
    getBestBody
};
