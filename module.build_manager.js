// module.build_manager.js

module.exports = {
    run(room) {
        if (!Memory.plan || !Memory.plan[room.name]) return;

        const planned = Memory.plan[room.name];
        const ctrl = room.controller;
        const rcl = ctrl ? ctrl.level : 0;

        let sitesCount = room.find(FIND_CONSTRUCTION_SITES).length;
        const maxSites = 3;
        
        for (const entry of planned) {
            if (sitesCount >= maxSites) break;
        
            if (entry.type === STRUCTURE_CONTAINER && rcl < 2) continue;
            if (entry.type === STRUCTURE_TOWER && rcl < 3) continue;
            if (entry.type === STRUCTURE_RAMPART && !ctrl) continue;
            if (entry.type === STRUCTURE_ROAD && rcl < 3) continue;
        
            const pos = new RoomPosition(entry.x, entry.y, room.name);
            const existing = pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType === entry.type);
            const site = pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(s => s.structureType === entry.type);
            const onRampart = entry.type === STRUCTURE_RAMPART && pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_RAMPART);
        
            if (existing.length === 0 && site.length === 0 && !onRampart) {
                if (room.createConstructionSite(entry.x, entry.y, entry.type) === OK) {
                    sitesCount++;
                }
            }
        }

        // Ajoute le storage à RCL4+
        if (rcl >= 4 && !room.storage) {
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            const spot = spawn.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            if (spot) {
                const storagePos = spot.pos.findClosestByPath(spawn.pos, { ignoreCreeps: true });
                if (storagePos) room.createConstructionSite(storagePos, STRUCTURE_STORAGE);
            }
        }

        // Ajoute une deuxième tower à RCL5+
        if (rcl >= 5) {
            const towers = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER
            });
            const sites = room.find(FIND_CONSTRUCTION_SITES, {
                filter: s => s.structureType === STRUCTURE_TOWER
            });
            if ((towers.length + sites.length) < 2) {
                const spawn = room.find(FIND_MY_SPAWNS)[0];
                const pos = spawn.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_EXTENSION
                });
                if (pos) {
                    const nearby = pos.pos.findInRange(FIND_STRUCTURES, 3, {
                        filter: s => s.structureType === STRUCTURE_ROAD
                    });
                    if (nearby.length > 0) {
                        const spot = nearby[0].pos;
                        room.createConstructionSite(spot, STRUCTURE_TOWER);
                    }
                }
            }
        }
    }
};
