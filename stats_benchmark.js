let stats_benchmark = {
    
    logMilestone: function(key, condition, extra = undefined) {
        if (!Memory.benchmarks) Memory.benchmarks = {};
        if (!Memory.benchmarks[key] && condition) {
            Memory.benchmarks[key] = Game.time;
            if (extra !== undefined) {
                console.log(`[BENCHMARK] ${key} atteint à ${Game.time} (${extra})`);
            } else {
                console.log(`[BENCHMARK] ${key} atteint à ${Game.time}`);
            }
        }
    },
    
    run: function(room) {
        if (!Memory.benchmarks) Memory.benchmarks = {};
        if (!Memory.benchmarks.start_tick) {
            Memory.benchmarks.start_tick = Game.time;
            console.log('[BENCHMARK] Script lancé au tick', Game.time);
        }

        const ctrl = room.controller;
        const spawns = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN});
        const creeps = _.filter(Game.creeps, c => c.memory.role === 'worker' && c.room.name === room.name);

        this.logMilestone('spawn_placed', spawns.length > 0);
        this.logMilestone('first_creep', creeps.length > 0);
        this.logMilestone('RC2', ctrl.level >= 2, `progress: ${((ctrl.progress / ctrl.progressTotal) * 100).toFixed(1)}%`);
        this.logMilestone('RC3', ctrl.level >= 3);
        this.logMilestone('RC4', ctrl.level >= 4);

        let extensionsBuilt = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_EXTENSION}).length;
        this.logMilestone('5_extensions', extensionsBuilt >= 5);
        this.logMilestone('10_extensions', extensionsBuilt >= 10);
        this.logMilestone('20_extensions', extensionsBuilt >= 20);

        let containersBuilt = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_CONTAINER}).length;
        this.logMilestone('container_source', containersBuilt > 0);

        let roadsBuilt = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_ROAD}).length;
        this.logMilestone('first_road', roadsBuilt > 0);

        let towersBuilt = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_TOWER}).length;
        this.logMilestone('1_tower', towersBuilt > 0);
    }
};

module.exports = stats_benchmark;
