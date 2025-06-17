// module.remote_colonizer.js

module.exports = {
    getRemoteTargets(mainRoomName) {
        if (!Memory.exploration) return [];

        const possibleRooms = Object.entries(Memory.exploration)
            .filter(([name, data]) =>
                data.explored &&
                data.accessibleFrom &&
                data.accessibleFrom.includes(mainRoomName) &&
                (!Memory.remoteMining || !Memory.remoteMining[name])
            )
            .map(([name]) => name);

        return possibleRooms;
    },

    registerRemote(name) {
        if (!Memory.remoteMining) Memory.remoteMining = {};
        if (!Memory.remoteMining[name]) {
            Memory.remoteMining[name] = {
                status: 'init',
                launchedAt: Game.time
            };
        }
    },

    getCurrentColonies() {
        return Object.entries(Memory.remoteMining || {}).map(([name, data]) => ({
            room: name,
            status: data.status
        }));
    }
};
