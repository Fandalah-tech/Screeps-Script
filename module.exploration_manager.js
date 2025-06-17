// module.exploration_manager.js

const explorationManager = {
    run(room) {
        if (!room.controller || !room.controller.my) return;
        if (!Memory.exploration) Memory.exploration = {};

        const exits = Game.map.describeExits(room.name);
        for (const dir in exits) {
            const exitRoom = exits[dir];
            if (!Memory.exploration[exitRoom]) {
                Memory.exploration[exitRoom] = {
                    explored: false,
                    accessibleFrom: [room.name]
                };
            } else {
                if (!Memory.exploration[exitRoom].accessibleFrom.includes(room.name)) {
                    Memory.exploration[exitRoom].accessibleFrom.push(room.name);
                }
            }
        }
    },

    recordVisibility(roomName) {
        if (!Memory.exploration) Memory.exploration = {};
        if (!Memory.exploration[roomName]) Memory.exploration[roomName] = {
            explored: true,
            accessibleFrom: []
        };
        Memory.exploration[roomName].explored = true;
    },

    getUnexploredRooms(fromRoom) {
        const exits = Game.map.describeExits(fromRoom);
        const unexplored = [];
        for (const dir in exits) {
            const name = exits[dir];
            if (!Memory.exploration[name] || !Memory.exploration[name].explored) {
                unexplored.push(name);
            }
        }
        return unexplored;
    }
};

module.exports = explorationManager;
