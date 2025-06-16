const creepIcons = {
    harvester: '⛏️',
    superharvester: '💪⛏️',
    transporter: '🚚',
    builder: '🏗️️',
    repairer: '🔧',
    upgrader: '🎯',
    filler: '📥',
    remoteharvester: '🌍⛏️',
    remotebuilder: '🌍🏗️',
    remotetransporter: '🌍🚚',
};

function creepDetailLine(creep) {
    const role = creep.memory.role;
    const icon = {
        harvester: '⛏️',
        superharvester: '💎',
        transporter: '🚚',
        builder: '🏗️️',
        repairer: '🔧',
        upgrader: '🎯',
        filler: '📥',
        remoteharvester: '🌍⛏️',
        remotebuilder: '🌍🏗️',
        remotetransporter: '🌍🚚',
    }[role] || '❓';

    let statusIcon = creep.ticksToLive < 150 ? '⚠️' : '';
    let targetDesc = '';

    if (creep.memory.buildSiteId) {
        const target = Game.getObjectById(creep.memory.buildSiteId);
        if (target && target.pos) {
            targetDesc = `building ${target.structureType}(${target.pos.x},${target.pos.y})`;
        } else {
            targetDesc = `building`;
        }
    } else if (creep.memory.repairTargetId) {
        const target = Game.getObjectById(creep.memory.repairTargetId);
        if (target && target.pos) {
            targetDesc = `repairing ${target.structureType}(${target.pos.x},${target.pos.y})`;
        } else {
            targetDesc = `repairing`;
        }
    } else if (creep.memory.sourceId) {
        const target = Game.getObjectById(creep.memory.sourceId);
        if (target && target.pos) {
            targetDesc = `harvest from ${target.structureType || 'source'}(${target.pos.x},${target.pos.y})`;
        } else {
            targetDesc = `harvesting`;
        }
    } else if (creep.memory.fillTargetId) {
        const target = Game.getObjectById(creep.memory.fillTargetId);
        if (target && target.pos) {
            targetDesc = `filling ${target.structureType}(${target.pos.x},${target.pos.y})`;
        } else {
            targetDesc = `filling`;
        }
    } else if (creep.memory.role === 'upgrader' && creep.room.controller) {
        targetDesc = `upgrading controller`;
    }

    return `[${role}] ${icon}${statusIcon}${creep.ticksToLive} | ${creep.name}${targetDesc ? ' -> ' + targetDesc : ''}`;
}



function logFullRoomStatus(roomName, isMainRoom = false) {
    const thisRoom = Game.rooms[roomName];

    if (!thisRoom) {
        console.log(`<br>=== ${isMainRoom ? 'MAIN' : 'SECONDARY'} ROOM (${roomName}) ===`);
        console.log(`⚠️ Room ${roomName} non visible (pas encore scannée ou en dehors de visibilité)`);
        return;
    }
    
    if (!thisRoom.controller) {
        console.log(`<br>=== ${isMainRoom ? 'MAIN' : 'SECONDARY'} ROOM (${roomName}) ===`);
        console.log(`⚠️ Room ${roomName} sans controller (peut-être neutre ou hors territoire)`);
        return;
    }

    const controller = thisRoom.controller;
    const energy = thisRoom.energyAvailable;
    const energyCap = thisRoom.energyCapacityAvailable;
    const storage = thisRoom.storage ? thisRoom.storage.store[RESOURCE_ENERGY] : 0;
    const storageCap = thisRoom.storage ? thisRoom.storage.store.getCapacity(RESOURCE_ENERGY) : 0;
    const ctrlPct = controller.progressTotal ? ((controller.progress / controller.progressTotal) * 100).toFixed(1) : 'NaN';

    console.log(`<br>=== ${isMainRoom ? 'MAIN' : 'SECONDARY'} ROOM (${roomName}) ===`);
    console.log(`⚠️ Room ${roomName} | RCL${controller.level} (${ctrlPct}%) | Energy: ${energy}/${energyCap} | Storage: ${storage} (${((storage / (storageCap || 1)) * 100).toFixed(0)}%)`);

        const creeps = _.filter(Game.creeps, c => {
            // 1. Si creep est physiquement dans la room, il est visible ici
            if (c.room.name === roomName) return true;
        
            // 2. Si c'est un creep natif de cette room (memory.room), mais pas encore parti ou pas remote
            if (c.memory.room === roomName && !c.memory.targetRoom) return true;
        
            // 3. Si c'est un creep remote en transit, il NE doit PAS apparaître ici (sera listé comme transit)
            if (c.memory.homeRoom === roomName && c.memory.targetRoom && c.room.name !== c.memory.targetRoom) return false;
        
            // 4. Si c'est un creep remote arrivé dans sa destination
            if (c.memory.targetRoom === roomName && c.room.name === roomName) return true;
        
            return false;
        });

    const roles = isMainRoom
        ? ['harvester', 'builder', 'upgrader', 'repairer', 'transporter', 'superharvester', 'filler']
        : ['remoteharvester', 'remotebuilder', 'remotetransporter'];

        const roleLabels = {
            harvester: "H",
            builder: "B",
            upgrader: "U",
            repairer: "R",
            transporter: "T",
            superharvester: "SH",
            filler: "F",
            remoteharvester: "RH",
            remotebuilder: "RB",
            remotetransporter: "RT"
        };
        
        const roleStatus = roles.map(role => {
            const list = creeps.filter(c => c.memory.role === role);
            const count = list.length;
        
            let quota = 0;
            if (Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].quotas && Memory.rooms[roomName].quotas[role] !== undefined) {
                quota = Memory.rooms[roomName].quotas[role];
            }
        
            const label = roleLabels[role] || role.slice(0, 2).toUpperCase();
            return `${label}:${count >= quota ? '✅' : '❌'}${count}/${quota}`;
        }).join(' ');

    const presentCreeps = creeps.filter(c => c.room.name === roomName);
    const inTransitCreeps = _.filter(Game.creeps, c =>
        c.memory.homeRoom === roomName &&
        c.memory.targetRoom &&
        c.room.name !== c.memory.targetRoom
    );

    console.log(`Ratios: ${roleStatus} | Total : ${presentCreeps.length} creeps${inTransitCreeps.length > 0 ? ` (+${inTransitCreeps.length} en transit)` : ''}`);

    for (const creep of creeps) {
        console.log(creepDetailLine(creep));
    }

    const sites = thisRoom.find(FIND_CONSTRUCTION_SITES);
    const started = sites.filter(s => s.progress > 0);
    if (started.length > 0) {
        console.log(`Construction sites (${started.length}):`);
        for (let site of started) {
            const pct = ((site.progress / site.progressTotal) * 100).toFixed(1);
            console.log(`📦 ${site.structureType}(${site.pos.x},${site.pos.y}) → ${pct}%`);
        }
    }

    const waiting = sites.length - started.length;
    if (waiting > 0) console.log(`🕓 ${waiting} autres constructions en attente`);
}

module.exports = {
    logFullRoomStatus,
    creepDetailLine
};
