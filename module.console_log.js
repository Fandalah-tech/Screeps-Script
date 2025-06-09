module.exports = {
    logRoomStatus: function(room) {
        // Affichage global classique
        if (Game.time % 5 !== 0) return;

        let taskCounts = {};
        let allTasks = ['harvest', 'deposit', 'build', 'repair', 'transfer', 'upgrade', null];
        for (let t of allTasks) {
            taskCounts[t === null ? 'idle' : t] = _.sum(Game.creeps, c => c.memory.task === t && c.room.name === room.name);
        }
        let ctrl = room.controller;
        let rcPct = ((ctrl.progress / ctrl.progressTotal) * 100).toFixed(1);
        console.log(
            `Room ${room.name} | RCL${ctrl.level} (${rcPct}%) | ` +
            `Energy: ${room.energyAvailable}/${room.energyCapacityAvailable} | ` +
            `Creeps: ` +
            `H:${taskCounts.harvest} D:${taskCounts.deposit} B:${taskCounts.build} ` +
            `R:${taskCounts.repair} T:${taskCounts.transfer} U:${taskCounts.upgrade} ` +
            `Idle:${taskCounts.idle}`
        );
    },

    logTaskDetails: function(room) {
        // Affichage détaillé de chaque tâche (tous les 5 ticks par exemple)
        if (Game.time % 5 !== 0) return;

        // --- Harvesters par source (index + position + nb creeps)
        const sources = room.find(FIND_SOURCES);
        sources.forEach((source, i) => {
            const assigned = _.filter(Game.creeps, c =>
                c.memory.task === 'harvest' &&
                c.memory.workingSourceId === source.id &&
                c.room.name === room.name
            );
            console.log(`[Harvest] Source ${i} [${source.pos.x},${source.pos.y}] : ${assigned.length} creep(s)`);
        });

        // --- Creeps par tâche (affichage index de source, plus lisible et trace id pour debug)
        for (let name in Game.creeps) {
            let c = Game.creeps[name];
            if (c.room.name !== room.name) continue;
            let msg = `[${c.memory.task || 'idle'}] ${name}`;
            if (c.memory.task === 'harvest') {
                let srcIdx = '?';
                let srcPos = '?';
                let srcId = c.memory.workingSourceId || '?';
                if (srcId !== '?') {
                    let idx = sources.findIndex(s => s.id === srcId);
                    srcIdx = idx !== -1 ? idx : '?';
                    let srcObj = sources[idx];
                    if (srcObj) {
                        srcPos = `[${srcObj.pos.x},${srcObj.pos.y}]`;
                    }
                }
                msg += ` src:${srcIdx} ${srcPos}`;
            }
            
            if (c.memory.task === 'deposit' || c.memory.task === 'transfer') {
                let tgtId = c.memory.depositTargetId || c.memory.transferTargetId || null;
                let target = tgtId ? Game.getObjectById(tgtId) : null;
                if (target) {
                    let structType = target.structureType || '?';
                    let pos = target.pos ? `[${target.pos.x},${target.pos.y}]` : '';
                    let free = target.store && target.store.getFreeCapacity ? ` (${target.store.getFreeCapacity(RESOURCE_ENERGY)} free)` : '';
                    msg += ` tgt:${structType}${pos}${free}`;
                } else {
                    msg += ` tgt:?`;
                }
            }
            
            if (c.memory.task === 'build') {
                let siteId = c.memory.buildTargetId || '?';
                let site = siteId !== '?' ? Game.getObjectById(siteId) : null;
                if (site) {
                    let structType = site.structureType || '?';
                    let pos = site.pos ? `[${site.pos.x},${site.pos.y}]` : '';
                    msg += ` site:${structType}${pos}`;
                } else {
                    msg += ` site:?`;
                }
            }
            
            if (c.memory.task === 'repair') {
                let tgtId = c.memory.repairTargetId || '?';
                let target = tgtId !== '?' ? Game.getObjectById(tgtId) : null;
                if (target) {
                    let structType = target.structureType || '?';
                    let pos = target.pos ? `[${target.pos.x},${target.pos.y}]` : '';
                    let pct = target.hits && target.hitsMax ? ` (${Math.round(100*target.hits/target.hitsMax)}%)` : '';
                    msg += ` tgt:${structType}${pos}${pct}`;
                } else {
                    msg += ` tgt:?`;
                }  
            }

            msg += ` ${c.store[RESOURCE_ENERGY]}/${c.store.getCapacity(RESOURCE_ENERGY)}`;
            console.log(msg);
        }
    }
};
