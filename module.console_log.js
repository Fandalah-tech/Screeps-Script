// module.console_log.js

function _creepDetailLine(creep) {
    let task = '';
    if (creep.memory.sourceId) task = `🔄 ${creep.memory.sourceId.slice(-4)}`;
    if (creep.memory.containerId) task = `📦 ${creep.memory.containerId.slice(-4)}`;
    if (creep.memory.targetRoom) task += ` -> ${creep.memory.targetRoom}`;
    return `[${creep.memory.role}] ${creep.name} (${creep.ticksToLive}) ${task}`;
}

module.exports = {
    logFullRoomStatus() {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (!room.controller || !room.controller.my) continue;

            const creeps = _.filter(Game.creeps, c => c.memory.room === room.name);
            const grouped = _.groupBy(creeps, c => c.memory.role);
            const quota = role => _.filter(creeps, c => c.memory.role === role).length;

            console.log(`\n=== ${room.controller.my ? 'MAIN' : 'REMOTE'} ROOM (${room.name}) ===`);
            console.log(`⚙️ RCL${room.controller.level} | E: ${room.energyAvailable}/${room.energyCapacityAvailable}`);

            const roles = ['harvester','superharvester','transporter','filler','builder','repairer','upgrader','remoteharvester','remotebuilder','remotetransporter','scout'];
            const line = roles.map(r => `${r.slice(0,2).toUpperCase()}:${quota(r)}`).join(' | ');
            console.log(`👥 Creeps | ${line}`);

            creeps.forEach(c => console.log(_creepDetailLine(c)));
        }
    }
};