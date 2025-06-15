module.exports.logFullRoomStatus = function(quotas) {
    // Définis ta main room ici
    let mainRoom = "E29S16"; // Modifie si besoin

    let allRoles = ['harvester', 'builder', 'upgrader', 'repairer', 'transporter', 'superharvester', 'filler', 'remoteharvester', 'remotetransporter', 'remotebuilder'];
    let abbrevs = {
        harvester: 'H',
        builder: 'B',
        upgrader: 'U',
        repairer: 'R',
        transporter: 'T',
        superharvester: 'SH',
        filler: 'F',
        remoteharvester: 'RH',
        remotetransporter: 'RT',
        remotebuilder: 'RB'
    };

    function emojiRole(count, quota) {
        if (quota === undefined) return `${count}`;
        if (count < quota) return `❌${count}/${quota}`;
        if (count > quota) return `⚠️${count}/${quota}`;
        return `✅${count}/${quota}`;
    }

    // Regroupe les creeps par room
    let creepsByRoom = {};
    for (let name in Game.creeps) {
        let c = Game.creeps[name];
        let roomName = c.pos.roomName;
        if (!creepsByRoom[roomName]) creepsByRoom[roomName] = [];
        creepsByRoom[roomName].push(c);
    }
    let roomsWithCreeps = Object.keys(creepsByRoom);

    // Affiche la main room en premier
    let orderedRooms = [mainRoom, ...roomsWithCreeps.filter(r => r !== mainRoom).sort()];
    for (let roomName of orderedRooms) {
        let thisRoom = Game.rooms[roomName];
        // (room peut être undefined pour les rooms non visionnées, on skippe pour le RCL)
        let ctrl = thisRoom ? thisRoom.controller : undefined;
        let rcPct = ctrl ? ((ctrl.progress / ctrl.progressTotal) * 100).toFixed(1) : "?";
        let storageStr = '';
        let s = thisRoom ? thisRoom.find(FIND_STRUCTURES, { filter: t => t.structureType === STRUCTURE_STORAGE })[0] : undefined;
        let sEnergy = s ? s.store[RESOURCE_ENERGY] : 0;
        let sPct = s ? ((s.store[RESOURCE_ENERGY] / 1000000) * 100).toFixed(1) : "0";
        if (thisRoom && thisRoom.controller && thisRoom.controller.my) {
            storageStr = ` | Storage: ${sEnergy} (${sPct}%)`;
        }

        // Rôle counts (pour chaque room, y compris remote !)
        let roleCounts = {};
        for (let role of allRoles) {
            roleCounts[role] = _.sum(Game.creeps, c => c.memory.role === role && c.pos.roomName === roomName);
        }

        let rolesDisplay = allRoles.map(role =>
            `${abbrevs[role]}:${emojiRole(roleCounts[role], quotas && quotas[role])}`
        ).join(' ');

        let allOk = quotas && allRoles.every(role => roleCounts[role] === quotas[role]);
        let statusEmoji = allOk ? '🎉' : '⚠️';
        let totalCreeps = creepsByRoom[roomName] ? creepsByRoom[roomName].length : 0;

        // Entête room
        if (roomName === mainRoom) {
            console.log(`\n=== MAIN ROOM (${roomName}) ===`);
        } else {
            console.log(`\n=== SECONDARY ROOM (${roomName}) ===`);
        }
        // Ligne stat globale
        if (thisRoom) {
            console.log(`${statusEmoji} Room ${roomName} | RCL${ctrl ? ctrl.level : '?'} (${rcPct}%) | Energy: ${thisRoom.energyAvailable}/${thisRoom.energyCapacityAvailable}${storageStr} | Ratios: ${rolesDisplay} | Total : ${totalCreeps} creeps`);
        } else {
            // Room sans vision
            console.log(`${statusEmoji} Room ${roomName} | RCL? | Energy: ? | Ratios: ${rolesDisplay} | Total : ${totalCreeps} creeps`);
        }
        // Détail creeps
        if (creepsByRoom[roomName]) {
            for (let c of creepsByRoom[roomName]) {
                console.log(module.exports._creepDetailLine(c));
            }
        }
    }
};

module.exports._creepDetailLine = function(c) {
    let roleLabel = c.memory.role || 'no-role';
    if (c.memory.originalRole && c.memory.originalRole !== c.memory.role) {
        roleLabel = `${c.memory.originalRole}->${c.memory.role}`;
    }
    let msg = `[${roleLabel}] ${c.name} | Room: ${c.pos.roomName}`;
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
    if (c.memory.role === 'builder' || c.memory.role === 'remotebuilder') {
        let target = c.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (target) {
            msg += ` building ${target.structureType}(${target.pos.x},${target.pos.y})`;
        }
    }
    if (c.memory.role === 'upgrader') {
        msg += ` upgrading controller`;
    }
    // Affiche la charge énergie
    msg += ` -> ${c.store[RESOURCE_ENERGY] || 0}/${c.store.getCapacity(RESOURCE_ENERGY) || 0}`;
    return msg;
};
