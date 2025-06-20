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
    
        // === NOUVEAU : met à jour la liste des rooms voisines explorées ===
        const rooms = [];
        for (const dir in exits) {
            const neighbor = exits[dir];
            if (Memory.exploration[neighbor] && Memory.exploration[neighbor].explored) {
                rooms.push({
                    name: neighbor,
                    sources: Memory.exploration[neighbor].sources || []
                });
            }
        }
        // PATCH ANTI-CRASH ICI
        if (!Memory.exploration[room.name]) {
            Memory.exploration[room.name] = { explored: true, accessibleFrom: [] };
        }
        Memory.exploration[room.name].rooms = rooms;
    },

    recordVisibility(roomName) {
        if (!Memory.exploration) Memory.exploration = {};
        if (!Memory.exploration[roomName]) Memory.exploration[roomName] = {
            explored: true,
            accessibleFrom: []
        };
        Memory.exploration[roomName].explored = true;

        // === NOUVEAU : stocke les sources de la room explorée ===
        const room = Game.rooms[roomName];
        if (room) {
            Memory.exploration[roomName].sources = room.find(FIND_SOURCES).map(src => src.id);
        }
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
