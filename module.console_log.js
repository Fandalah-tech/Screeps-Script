module.exports = {
    logRoomStatus: function(room, quotas) {
        
        let storage = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_STORAGE  })[0];
        let storageEnergy = storage ? storage.store[RESOURCE_ENERGY] : 0;
        let storagePct = storage ? ((storage.store[RESOURCE_ENERGY] / 1000000) * 100).toFixed(1) : "0";

        console.log('📊 STATS 📊 ');
        
        let allRoles = ['harvester', 'builder', 'upgrader', 'repairer', 'transporter', 'superharvester'];
        let roleCounts = {};
        for (let role of allRoles) {
            roleCounts[role] = _.sum(Game.creeps, c => c.memory.role === role && c.room.name === room.name);
        }
        let ctrl = room.controller;
        let rcPct = ((ctrl.progress / ctrl.progressTotal) * 100).toFixed(1);

        // Helper emoji
        function emojiRole(count, quota) {
            if (quota === undefined) return `${count}`;
            if (count < quota) return `❌${count}/${quota}`;
            if (count > quota) return `⚠️${count}/${quota}`;
            return `✅${count}/${quota}`;
        }

        // Création du display par rôle avec abréviations
        let abbrevs = {
            harvester: 'H',
            builder: 'B',
            upgrader: 'U',
            repairer: 'R',
            transporter: 'T',
            superharvester: 'SH'
        };
        let rolesDisplay = allRoles.map(role =>
            `${abbrevs[role]}:${emojiRole(roleCounts[role], quotas && quotas[role])}`
        ).join(' ');

        // Emoji général global si tous les quotas sont atteints
        let allOk = quotas && allRoles.every(role => roleCounts[role] === quotas[role]);
        let statusEmoji = allOk ? '🎉' : '⚠️';

        // Nombre total de creeps dans la room
        let totalCreeps = _.sum(Game.creeps, c => c.room.name === room.name);

        // Log final
    console.log( `${statusEmoji} Room ${room.name} | RCL${ctrl.level} (${rcPct}%) | Energy: ${room.energyAvailable}/${room.energyCapacityAvailable} | Storage: ${storageEnergy} (${storagePct}%) | Ratios: ${rolesDisplay} | Total : ${totalCreeps} creeps`); },

    logCreepDetails: function(room) {
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
                    let container = c.pos.findInRange(FIND_STRUCTURES, 1, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    })[0];
                    let target = container;
                    if (!target) {
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
