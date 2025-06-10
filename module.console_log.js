module.exports = {
    logRoomStatus: function(room) {
        // Affichage global classique
        if (Game.time % 5 !== 0) return;

        // Liste des rôles utilisés
        let allRoles = ['harvester', 'builder', 'upgrader'];
        let roleCounts = {};
        for (let role of allRoles) {
            roleCounts[role] = _.sum(Game.creeps, c => c.memory.role === role && c.room.name === room.name);
        }
        let ctrl = room.controller;
        let rcPct = ((ctrl.progress / ctrl.progressTotal) * 100).toFixed(1);

        console.log(
            `Room ${room.name} | RCL${ctrl.level} (${rcPct}%) | ` +
            `Energy: ${room.energyAvailable}/${room.energyCapacityAvailable} | ` +
            `Creeps: H:${roleCounts.harvester} B:${roleCounts.builder} U:${roleCounts.upgrader}`
        );
    },

    logCreepDetails: function(room) {
        // Affichage détaillé de chaque creep (tous les 5 ticks)
        if (Game.time % 5 !== 0) return;

        for (let name in Game.creeps) {
            let c = Game.creeps[name];
            if (c.room.name !== room.name) continue;
            let msg = `[${c.memory.role || 'no-role'}] ${name}`;

            if (c.memory.role === 'harvester') {
                let target = c.pos.findClosestByPath(FIND_SOURCES);
                if (target) {
                    msg += ` target source: [${target.pos.x},${target.pos.y}]`;
                }
            }
            if (c.memory.role === 'builder') {
                let target = c.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (target) {
                    msg += ` build site: [${target.pos.x},${target.pos.y}]`;
                }
            }
            if (c.memory.role === 'upgrader') {
                msg += ` upgrading controller`;
            }

            msg += ` ${c.store[RESOURCE_ENERGY]}/${c.store.getCapacity(RESOURCE_ENERGY)}`;
            console.log(msg);
        }
    }
};
