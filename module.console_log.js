const roleAbbr = {
    harvester: 'H',
    superharvester: 'SH',
    transporter: 'T',
    filler: 'F',
    builder: 'B',
    repairer: 'R',
    upgrader: 'U',
    remoteharvester: 'RH',
    remotebuilder: 'RB',
    remotetransporter: 'RT',
    scout: 'S'
};

function _creepDetailLine(creep) {
    const role = creep.memory.role;
    const name = creep.name;
    const ttl = creep.ticksToLive;

    const counts = _.countBy(creep.body, p => p.type);
    const code = [];
    if (counts.work)  code.push(`${counts.work}Wo`);
    if (counts.carry) code.push(`${counts.carry}Ca`);
    if (counts.move)  code.push(`${counts.move}Mo`);
    if (counts.attack) code.push(`${counts.attack}At`);
    if (counts.ranged_attack) code.push(`${counts.ranged_attack}Ra`);
    if (counts.heal)   code.push(`${counts.heal}He`);
    if (counts.claim)  code.push(`${counts.claim}Cl`);
    if (counts.tough)  code.push(`${counts.tough}To`);

    const totalHP = creep.body.length * 100;
    const bodySummary = `${totalHP}-${code.join('')}`;

    let task = '';
    if (creep.memory.sourceId) task = `🔄 ${creep.memory.sourceId.slice(-4)}`;
    if (creep.memory.containerId) task = `📦 ${creep.memory.containerId.slice(-4)}`;
    if (creep.memory.targetRoom) task += ` -> ${creep.memory.targetRoom}`;

    if (creep.memory.working && ['builder', 'remotebuilder'].includes(role)) {
        const site = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
        if (site) task = `🏗️ ${site.structureType} (${site.id.slice(-4)})`;
    }

    if (creep.memory.working && role === 'repairer') {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => s.hits < s.hitsMax && s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_RAMPART
        });
        if (target) task = `🛠️ ${target.structureType} (${target.id.slice(-4)})`;
    }

    if (creep.memory.working && role === 'upgrader' && creep.room.controller) {
        task = `⚡ controller (${creep.room.controller.id.slice(-4)})`;
    }

    return `${name} (${ttl}) | ${bodySummary} | ${task}`;
}

function logFullRoomStatus() {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;

        const creeps = _.filter(Game.creeps, c => c.memory.room === room.name);
        const grouped = _.groupBy(creeps, c => c.memory.role);
        const quota = role => _.filter(creeps, c => c.memory.role === role).length;

        console.log(`\n=== ${room.controller.my ? 'MAIN' : 'REMOTE'} ROOM (${room.name}) ===`);
        console.log(`⚙️ RCL${room.controller.level} | E: ${room.energyAvailable}/${room.energyCapacityAvailable}`);

        const roles = ['harvester','superharvester','transporter','filler','builder','repairer','upgrader','remoteharvester','remotebuilder','remotetransporter','scout'];
        const line = roles.map(r => `${roleAbbr[r]}:${quota(r)}`).join(' | ');
        console.log(`👥 Creeps | ${line}`);

        creeps.forEach(c => console.log(_creepDetailLine(c)));
    }
}

function logMiningSlots() {
    if (!Memory.miningSlots) return;

    for (const roomName in Memory.miningSlots) {
        const room = Game.rooms[roomName];
        console.log(`\n--- Mining slots pour ${roomName} ---`);
        Memory.miningSlots[roomName].forEach((slot, i) => {
            let status = "AVAILABLE";

            if (slot.takenBy) {
                const creep = Game.creeps[slot.takenBy];
                if (!creep) {
                    status = `❌ MISSING creep ${slot.takenBy}`;
                } else if (creep.pos.x === slot.x && creep.pos.y === slot.y) {
                    status = `✅ OCCUPIED by ${slot.takenBy}`;
                } else if (
                    creep.memory.targetPos &&
                    creep.memory.targetPos.x === slot.x &&
                    creep.memory.targetPos.y === slot.y &&
                    creep.memory.targetPos.roomName === roomName
                ) {
                    status = `🧠 RESERVED (in memory) by ${slot.takenBy}`;
                } else {
                    status = `⚠️ RESERVED (invalid) by ${slot.takenBy}`;
                }
            }

            console.log(`Slot ${i + 1} @ (${slot.x},${slot.y}) : ${status}`);
        });
    }
}


module.exports = {
    logFullRoomStatus,
    logMiningSlots
};
