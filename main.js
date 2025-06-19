// main.js (refonte complète)
const consoleLog = require('module.console_log');
const spawnManager = require('module.spawn_manager');
const explorationManager = require('module.exploration_manager');
const remoteDeployer = require('module.auto_remote_deployer');
const planBase = require('module.plan_base');
const buildManager = require('module.build_manager');
const towerManager = require('module.tower_manager');
const benchmark = require('stats_benchmark');
const { initMiningSlots } = require('module.utils');
const { drawMiningSlots } = require('module.visual_debug');
const { drawVisualOverlay } = require('module.visual_debug');
const showMilestones = require('commands');


global.toggleVisualOverlay = function () {
    if (!Memory.debug) Memory.debug = {};
    Memory.debug.visuals = !Memory.debug.visuals;
    console.log(`🔁 Visuals toggled to: ${Memory.debug.visuals}`);
};

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
    scout: require('role.scout'),
    defender: require('role.defender')
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
    
    // --- 🔁 Détection de respawn ---
    if (!Memory.lastRoom || !Game.spawns["Spawn1"] || Game.spawns["Spawn1"].room.name !== Memory.lastRoom) {
        const newRoom = Game.spawns["Spawn1"] ? Game.spawns["Spawn1"].room.name : null;
        
        if (newRoom && newRoom !== Memory.lastRoom) {
            console.log(`🧹 Respawn détecté (ancienne room: ${Memory.lastRoom || 'aucune'} → nouvelle: ${newRoom}). Nettoyage mémoire...`);
    
            // On ne touche pas à benchmarks si la room précédente est encore en cours
            Memory.benchmarks = {};
            Memory.plan = {};
            Memory.miningSlots = {};
            Memory.rooms = {};
        }
    
        Memory.lastRoom = newRoom;
    }

    // Cleanup
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name].sourceId;
            delete Memory.creeps[name].targetPos;
            delete Memory.creeps[name];
        }
    }
    
    // Affichage du visuel en overlay
    for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (room.controller && room.controller.my) {
        drawVisualOverlay(roomName);
    }
    }
    
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            if (!Memory.miningSlots || !Memory.miningSlots[room.name]) {
                const utils = require('module.utils');
                utils.initMiningSlots(room);
            }
        }
    }

    // --- LOGIC ---
    const rooms = Game.rooms;
    for (const roomName in rooms) {
        const room = rooms[roomName];

        if (!room.controller || !room.controller.my) continue;

        // *** INITIALISATION ROBUSTE DE Memory.rooms ***
        Memory.rooms = Memory.rooms || {};
        Memory.rooms[roomName] = Memory.rooms[roomName] || {};

        // Exploration
        explorationManager.run(room);

        // Planification initiale si nécessaire
        if (!Memory.plan || !Memory.plan[room.name]) {
            planBase.plan(room);
        }

        if (!Memory.rooms[roomName].basePlan) {
            planBase.plan(room);
        }
        
        // Planification des minings slots si nécessaire
        if (!Memory.miningSlots || !Memory.miningSlots[roomName]) {
            initMiningSlots(room);
        }

        // Construction automatique
        buildManager.run(room);

        // Comportement des tours défensives
        towerManager.run(room);

        // Spawning
        const isMainRoom = room.find(FIND_MY_SPAWNS).some(s => s.name === 'Spawn1');
        
        // --- ⚠️ Détection hostile et spawn DEFENDER ---
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        const numDefenders = _.filter(Game.creeps, c => c.memory.role === 'defender' && c.memory.room === room.name).length;
        const numTowers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER }).length;
        
        if (hostileCreeps.length > numDefenders && numTowers === 0) {
            const spawns = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_SPAWN && !s.spawning
            });
            if (spawns.length > 0) {
                const body = [TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK];
                const name = `D-${Game.time % 1000}`;
                const memory = {
                    role: 'defender',
                    room: room.name
                };
                if (!Game.creeps[name]) {
                    const result = spawns[0].spawnCreep(body, name, { memory });
                    if (result === OK) {
                        console.log(`🛡️ Defender spawné pour défendre la room ${room.name}`);
                        return; // on interrompt le spawning normal ce tick
                    }
                }
            }
        }
        
        spawnManager.run(room, isMainRoom);

        // Remote auto-deploy only for main room
        if (isMainRoom) remoteDeployer.run(room);
    }

    // Run creeps
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
    
        if (!role) {
            console.log(`🧹 ${name} n’a pas de rôle → suicide`);
            creep.say('💀 no role');
            creep.suicide();
            continue; // évite d'exécuter un rôle inexistant
        }
    
        if (roles[role]) {
            try {
                roles[role].run(creep);
            } catch (e) {
                console.log(`❌ Erreur avec ${role} (${creep.name}) :`, e);
            }
        }
    }
    
    // Libération auto des slots orphelins (creeps morts)
     if (Memory.miningSlots) {
        for (let roomName in Memory.miningSlots) {
            const room = Game.rooms[roomName]; // ✅ ajout critique
    
            for (let slot of Memory.miningSlots[roomName]) {
                if (!slot.takenBy) continue;
                const creep = Game.creeps[slot.takenBy];
    
                const creepsOnTile = room.find(FIND_CREEPS, {
                    filter: c => c.pos.x === slot.x && c.pos.y === slot.y
                });
                const realOccupant = creepsOnTile.length > 0 ? creepsOnTile[0] : null;
    
                if (
                    !creep ||
                    !creep.memory.targetPos ||
                    creep.memory.targetPos.x !== slot.x ||
                    creep.memory.targetPos.y !== slot.y ||
                    creep.pos.x !== slot.x || creep.pos.y !== slot.y ||
                    (realOccupant && realOccupant.name !== slot.takenBy)
                ) {
                    // Slot invalide ou occupé illégitimement
                    slot.takenBy = null;
                }
            }
        }
    }
    
    // Réassignation automatique des slots physiques non déclarés
    for (let roomName in Memory.miningSlots) {
        const room = Game.rooms[roomName];
        if (!room) continue;
    
        for (const slot of Memory.miningSlots[roomName]) {
            if (slot.takenBy) continue; // déjà pris
    
            const creepsHere = room.lookForAt(LOOK_CREEPS, slot.x, slot.y);
            if (creepsHere.length === 1) {
                const creep = creepsHere[0];
    
                // Seulement pour les rôles éligibles
                if (['harvester', 'upgrader', 'builder'].includes(creep.memory.role)) {
                    // Ne pas réassigner s'il a déjà une cible différente en mémoire
                    const current = creep.memory.targetPos;
                    if (current && (current.x !== slot.x || current.y !== slot.y)) continue;
                
                    console.log(`🪑 Réassignation auto : ${creep.name} prend slot (${slot.x},${slot.y})`);
                    slot.takenBy = creep.name;
                    creep.memory.sourceId = slot.sourceId;
                    creep.memory.targetPos = { x: slot.x, y: slot.y, roomName: roomName };
                    creep.memory.mining = {
                        sourceId: slot.sourceId,
                        targetPos: { x: slot.x, y: slot.y, roomName: roomName },
                        since: Game.time
                    };
                }
            }
        }
    }
    
    // --- LOG ---
    if (Game.time % 10 === 0) {
        consoleLog.logFullRoomStatus();
        consoleLog.logMiningSlots(); // ✅ ajout fiable et centralisé
    }

    // --- BENCHMARK ---
    if (Game.time % 50 === 0) {
        benchmark.run();
    }

};