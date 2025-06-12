module.exports = {
    logRoomStatus: function(room) {
        // Affichage global classique (tous les X ticks)
        if (Game.time % 1 !== 0) return;

        // Liste des rôles utilisés
        let allRoles = ['harvester', 'builder', 'upgrader', 'repairer', 'transporter', 'superharvester'];
        let roleCounts = {};
        for (let role of allRoles) {
            roleCounts[role] = _.sum(Game.creeps, c => c.memory.role === role && c.room.name === room.name);
        }
        let ctrl = room.controller;
        let rcPct = ((ctrl.progress / ctrl.progressTotal) * 100).toFixed(1);
        
        console.log(
            `Room ${room.name} | RCL${ctrl.level} (${rcPct}%) | ` +
            `Energy: ${room.energyAvailable}/${room.energyCapacityAvailable} | ` +
            `Creeps: H:${roleCounts.harvester} B:${roleCounts.builder} U:${roleCounts.upgrader} R:${roleCounts.repairer} T:${roleCounts.transporter} SH:${roleCounts.superharvester}`
        );
    },
        
    logCreepDetails: function(room) {
        // Affichage détaillé de chaque creep (tous les X ticks)
        if (Game.time % 1 !== 0) return;

        for (let name in Game.creeps) {
            let c = Game.creeps[name];
            if (c.room.name !== room.name) continue;
            let roleLabel = c.memory.role || 'no-role';
            if (c.memory.originalRole && c.memory.originalRole !== c.memory.role) {
                roleLabel = `${c.memory.originalRole}->${c.memory.role}`;
            }
            let msg = `[${roleLabel}] ${name}`;

            if (c.memory.role === 'harvester') {
                if (c.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                    // Il est plein, il cherche où déposer
                    // Prio container adjacent
                    let container = c.pos.findInRange(FIND_STRUCTURES, 1, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    })[0];
                    let target = container;
                    if (!target) {
                        // Fallback : extension/spawn à remplir
                        target = c.room.find(FIND_STRUCTURES, {
                            filter: s =>
                                (s.structureType === STRUCTURE_EXTENSION ||
                                 s.structureType === STRUCTURE_SPAWN) &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                        })[0];
                    }
                    if (target) {
                        msg += ` depositing to ${target.structureType}(${target.pos.x},${target.pos.y})`;
                    } else {
                        msg += ` depositing: no target`;
                    }
                } else {
                    // Il va miner une source
                    let target = c.pos.findClosestByPath(FIND_SOURCES);
                    if (target) {
                        msg += ` harvest from source(${target.pos.x},${target.pos.y})`;
                    }
                }
            }

            if (c.memory.role === 'builder') {
                let target = c.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (target) {
                    msg += ` building ${target.structureType}(${target.pos.x},${target.pos.y})`;
                }
            }
            if (c.memory.role === 'upgrader') {
                msg += ` upgrading controller`;
            }

            msg += `-> ${c.store[RESOURCE_ENERGY]}/${c.store.getCapacity(RESOURCE_ENERGY)}`;
            console.log(msg);
        }
    }
};
