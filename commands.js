global.showMilestones = function () {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;

        console.log(`🏁 Milestones - Room: ${roomName}`);
        console.log(`  - RCL: ${room.controller.level} (${room.controller.progress}/${room.controller.progressTotal})`);

        const containers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length;
        const towers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER }).length;
        const storage = room.storage ? '✅' : '❌';

        console.log(`  - Containers: ${containers}`);
        console.log(`  - Towers: ${towers}`);
        console.log(`  - Storage: ${storage}`);

        let slots = 0;
        if (Memory.miningSlots && Memory.miningSlots[roomName]) {
            slots = Memory.miningSlots[roomName].length;
        }
        console.log(`  - Mining slots init: ${slots > 0 ? '✅' : '❌'} (${slots})`);

        let plan = null;
        if (Memory.plan && Memory.plan[roomName]) {
            plan = Memory.plan[roomName];
        }
        console.log(`  - Base Plan: ${plan ? `✅ (${plan.length} items)` : '❌'}`);
        
        // === Milestones enregistrés ===
        if (Memory.benchmarks && Memory.benchmarks[roomName]) {
            console.log(`  - Ticks milestones:`);
            
            let baseTick = undefined;
            if (Memory.benchmarks && Memory.benchmarks[roomName] && Memory.benchmarks[roomName].spawned !== undefined) {
                baseTick = Memory.benchmarks[roomName].spawned;
            }
            if (baseTick !== undefined) {
                console.log(`  - Spawned at tick: T${baseTick}`);
            }
            
            for (const key in Memory.benchmarks[roomName]) {
                const tick = Memory.benchmarks[roomName][key];
                const delta = baseTick !== undefined ? ` (+${tick - baseTick})` : '';
                console.log(`    • ${key} → T${tick}${delta}`);
            }
        }
        
    }
};
