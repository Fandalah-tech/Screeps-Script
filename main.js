// main.js (refonte complète)
const consoleLog = require('module.console_log');
const spawnManager = require('module.spawn_manager');
const explorationManager = require('module.exploration_manager');
const remoteDeployer = require('module.auto_remote_deployer');
const planBase = require('module.plan_base');
const buildManager = require('module.build_manager');
const towerManager = require('module.tower_manager');
const benchmark = require('stats_benchmark');

const roles = {
    harvester: require('role.harvester'),
    superharvester: require('role.superharvester'),
    upgrader: require('role.upgrader'),
    builder: require('role.builder'),
    repairer: require('role.repairer'),
    transporter: require('role.transporter'),
    filler: require('role.filler'),
    remoteharvester: require('role.remoteharvester'),
    remotebuilder: require('role.remotebuilder'),
    remotetransporter: require('role.remotetransporter'),
    scout: require('role.scout')
};

// Optional debug reset (call manually if needed)
if (Memory.__RESET__) {
    delete Memory.creeps;
    delete Memory.exploration;
    delete Memory.remoteMining;
    delete Memory.plan;
    console.log('🧹 Memory reset effectué.');
    delete Memory.__RESET__;
}

module.exports.loop = function () {
    // Cleanup
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) delete Memory.creeps[name];
    }

    // --- LOGIC ---
    const rooms = Game.rooms;
    for (const roomName in rooms) {
        const room = rooms[roomName];

        if (!room.controller || !room.controller.my) continue;

        // Exploration
        explorationManager.run(room);

        // Planification initiale si nécessaire
        if (!Memory.plan || !Memory.plan[room.name]) {
            planBase.plan(room);
        }

        // Construction automatique
        buildManager.run(room);

        // Comportement des tours défensives
        towerManager.run(room);

        // Spawning
        const isMainRoom = room.find(FIND_MY_SPAWNS).some(s => s.name === 'Spawn1');
        spawnManager.run(room, isMainRoom);

        // Remote auto-deploy only for main room
        if (isMainRoom) remoteDeployer.run(room);
    }

    // Run creeps
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
        if (roles[role]) {
            try {
                roles[role].run(creep);
            } catch (e) {
                console.log(`❌ Erreur avec ${role} (${creep.name}) :`, e);
            }
        }
    }

    // --- LOG ---
    if (Game.time % 10 === 0) {
        consoleLog.logFullRoomStatus();
    }

    // --- BENCHMARK ---
    if (Game.time % 50 === 0) {
        benchmark.run();
    }
};