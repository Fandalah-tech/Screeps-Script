// role.scout.js
const explorationManager = require('module.exploration_manager');

module.exports = {
    run: function(creep) {
        
        // --- PATCH auto-suicide scout ---
        const mainRoom = Game.spawns['Spawn1'].room.name;
        if (creep.room.name === mainRoom) {
            const exploration = Memory.exploration && Memory.exploration[mainRoom];
            let unexplored = [];
            if (exploration && exploration.rooms) {
                unexplored = exploration.rooms.filter(r => !r.sources || r.sources.length === 0);
            }
            if (unexplored.length === 0) {
                creep.say('Bye 👋');
                creep.suicide();
                return;
            }
        }
        
        
        const origin = creep.memory.room;

        if (!origin) return;

        if (!creep.memory.targetRoom || Game.rooms[creep.memory.targetRoom]) {
            const unexplored = explorationManager.getUnexploredRooms(origin);
            if (unexplored.length > 0) {
                creep.memory.targetRoom = unexplored[0];
            } else {
                creep.say('🔍 done');
                return;
            }
        }

        if (creep.room.name === creep.memory.targetRoom) {
            explorationManager.recordVisibility(creep.room.name);
            delete creep.memory.targetRoom;
            return;
        }

        creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {
            visualizePathStyle: { stroke: '#88ccff' }
        });
    }
};
