// module.spawn_manager.js
const bodyManager = require('module.body_manager');
const quotaManager = require('module.quota_manager');

const spawnManager = {
    run(room, isMainRoom = false) {
        const spawns = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_SPAWN && !s.spawning
        });
        if (spawns.length === 0) return;

        const quotas = quotaManager.getQuotas(room, isMainRoom);

        const creepsInRoom = _.filter(Game.creeps, c => c.memory.room === room.name);
        const counts = _.countBy(creepsInRoom, c => c.memory.role);

        for (let role in quotas) {
            const needed = quotas[role];
            const current = counts[role] || 0;

            if (current < needed) {
                const energyAvailable = room.energyAvailable;
                const body = bodyManager.getBestBody(role, energyAvailable);
                const name = `${role.substring(0, 2).toUpperCase()}-${Game.time}`;
                const memory = {
                    role,
                    room: room.name,
                };

                const result = spawns[0].spawnCreep(body, name, { memory });
                if (result === OK) return; // Un spawn à la fois par tick
            }
        }
    }
};

module.exports = spawnManager;
