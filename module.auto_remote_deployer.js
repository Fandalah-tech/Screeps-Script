// module.auto_remote_deployer.js

module.exports = {
    run(room) {
        if (!Memory.remoteMining) Memory.remoteMining = {};
        if (!Memory.exploration || !Memory.exploration[room.name]) return;

        const controllerLevel = room.controller.level;
        const maxRemotes = controllerLevel >= 5 ? 3 : controllerLevel >= 4 ? 2 : controllerLevel >= 2 ? 1 : 0;

        let remotes = Memory.remoteMining[room.name] || [];

        // Nettoyage des remotes bloqués depuis >2000 ticks
        const now = Game.time;
        remotes = remotes.filter(r => {
            if (r.status === 'blocked' && now - r.assigned > 2000) {
                console.log(`♻️ Remote ${r.room} débloqué pour re-tentative.`);
                return false;
            }
            return true;
        });

        Memory.remoteMining[room.name] = remotes;

        if (remotes.length >= maxRemotes) return;

        const exploredRooms = Memory.exploration[room.name].rooms || [];
        const existingTargets = remotes.map(r => r.room);

        for (const data of exploredRooms) {
            const name = data.name;
            if (existingTargets.includes(name)) continue;
            if (Game.map.getRoomStatus(name).status !== 'normal') continue;

            const sources = data.sources || [];
            if (sources.length === 0) continue;

            const nextRemote = {
                room: name,
                sourceIndex: 0,
                status: 'pending',
                assigned: Game.time
            };

            Memory.remoteMining[room.name].push(nextRemote);
            console.log(`🚀 Nouveau remote mining lancé depuis ${room.name} vers ${name}`);
            break;
        }
    }
};