const roleHarvester = require('role.harvester');
const roleSuperHarvester = require('role.superharvester');
const roleTransporter = require('role.transporter');
const roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleUpgrader = require('role.upgrader');
const roleFiller = require('role.filler');
const roleRemoteHarvester = require('role.remoteharvester');
const roleRemoteTransporter = require('role.remotetransporter');
const roleRemoteBuilder = require('role.remotebuilder');
const { planBase } = require('module.plan_base');
const build_manager = require('module.build_manager');
const consoleLog = require('module.console_log');
const stats_benchmark = require('stats_benchmark');
const { getBestBody } = require('module.body_manager');
const tower_manager = require('module.tower_manager');

// === Fonction de "softlock" et d'urgence ===
function isCriticalContainerMissing(room, sources) {
    // True si un container manque près d'une source (PAS le controller pour recovery SH/T)
    for (const source of sources) {
        let hasContainer = false;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let x = source.pos.x + dx, y = source.pos.y + dy;
                if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                if (room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER)) {
                    hasContainer = true;
                }
            }
        }
        if (!hasContainer) return true;
    }
    return false;
}

function getCriticalRepairCount(room) {
    // Compte containers et ramparts < 2500 HP
    let critical = 0;
    critical += room.find(FIND_STRUCTURES, {
        filter: s =>
            (s.structureType === STRUCTURE_CONTAINER && s.hits < 2500) ||
            (s.structureType === STRUCTURE_RAMPART && s.hits < 2500)
    }).length;
    return critical;
}

module.exports.loop = function() {
    // Nettoyage mémoire
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
    
    let room = Game.spawns['Spawn1'].room;
    let sources = room.find(FIND_SOURCES);
    let ctrlLevel = room.controller.level;
    let totalEnergy = room.energyAvailable;
    let totalCapacity = room.energyCapacityAvailable;
    let spawn = Game.spawns['Spawn1'];

    // Comptage de stockage
    let numExtensions = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_EXTENSION}).length;
    let numExtensionsSites = room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_EXTENSION}).length;
    let storage = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_STORAGE})[0];
    let storageSite = room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_STORAGE}).length;

    // Comptage par rôle
    let numHarvesters      = _.sum(Game.creeps, c => c.memory.role == 'harvester');
    let numSuperHarvester  = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
    let numTransporter     = _.sum(Game.creeps, c => c.memory.role == 'transporter');
    let numBuilders        = _.sum(Game.creeps, c => c.memory.role === 'builder');
    let numRepairers       = _.sum(Game.creeps, c => c.memory.role == 'repairer');
    let numUpgraders       = _.sum(Game.creeps, c => c.memory.role == 'upgrader');
    let numFillers       = _.sum(Game.creeps, c => c.memory.role == 'filler');
    let numRemoteHarvester       = _.sum(Game.creeps, c => c.memory.role == 'remoteharvester');
    let numRemoteTransporter       = _.sum(Game.creeps, c => c.memory.role == 'remotetransporter');
    let numRemoteBuilder       = _.sum(Game.creeps, c => c.memory.role == 'remotebuilder');
    
    // === Quotas dynamiques ===
    let quota_harvester = sources.length;
    let quota_superharvester = 0;
    let quota_transporter = 0;
    let quota_builder = 2;
    let quota_repairers = 1;
    let quota_upgrader = Math.min(ctrlLevel, 4); // plafonne à 4 U, adapte si besoin
    let quota_filler = 1;
    let quota_remoteharvester = 1;
    let quota_remotetransporter = 1;
    let quota_remotebuilder = 2;

    // 1. Nombre de sources avec container
    let sourcesWithContainer = sources.filter(source =>
        room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.pos.getRangeTo(source) <= 1
        }).length > 0
    ).length;
    
    // 2. Quotas dynamiques
    quota_superharvester = sourcesWithContainer;
    quota_transporter = sourcesWithContainer + (sourcesWithContainer === sources.length ? 1 : 0);

    // Bonus builder si énergie très pleine
    if (ctrlLevel >= 2 && totalEnergy > totalCapacity * 0.80) {
        quota_builder++;
    }
    // Bonus builder si niveau 4+ et storage à constuire
    if (ctrlLevel >= 4 && !storage) {
        quota_builder++;
    }

    // Bonus upgraders uniquement si buffer excédentaire
    if (totalEnergy >= totalCapacity * 0.98 && storage && storage.store[RESOURCE_ENERGY] > 20000) {
        quota_upgrader += 2;
    }

    // +1 repair si containers/ramparts à réparer
    let critRep = getCriticalRepairCount(room);
    quota_repairers += Math.min(2, critRep);
    
    if ((ctrlLevel >= 4) && (!storage || storageSite > 0 || numExtensionsSites > 0 )) {
        // Tant que storage ou extensions à construire, quota_upgrader = 0
        quota_upgrader = 0;
    }
    
    // Quotas combinés pour transfert vers le log
    let quotas = {
        harvester: quota_harvester,
        builder: quota_builder,
        upgrader: quota_upgrader,
        repairer: quota_repairers,
        transporter: quota_transporter,
        superharvester: quota_superharvester,
        filler: quota_filler,
        remoteharvester: quota_remoteharvester,
        remotetransporter: quota_remotetransporter,
        remotebuilder: quota_remotebuilder
    };
    
    // Ajout sécurisé dans la mémoire
    if (!Memory.rooms) Memory.rooms = {};
    if (!Memory.rooms[room.name]) Memory.rooms[room.name] = {};
    Memory.rooms[room.name].quotas = quotas;
    
    // Flag recoveryMode global
    let recoveryMode = (numTransporter < quota_transporter || numSuperHarvester < quota_superharvester);
    
    Memory.forceParkUpgraders = ( (ctrlLevel >= 4) &&  ( !storage || storageSite > 0 || numExtensionsSites > 0  ));
    
    let canSpawn = !spawn.spawning; // Vérifie si le spawn est libre

     if (canSpawn) {
        if (!Memory.creepId) Memory.creepId = 1;
        
                // Helper pour générer un nom unique et incrémenter si succès
        function spawnWithId(spawn, body, namePrefix, mem) {
            let creepId = Memory.creepId;
            let ret = spawn.spawnCreep(body, namePrefix + creepId, mem);
            if (ret === OK) {
                Memory.creepId++;
                if (Memory.creepId > 999) Memory.creepId = 1;
            }
            return ret;
        }
        
        // === SPAWN AUTOMATIQUE DES REMOTES (exemple pour une remote) ===
        const remoteConfig = [
            {
                targetRoom: 'E25S19',
                sourceId: '6845d068b4a6e60029b2516b', 
                containerId: '68501d549c0c9b0029071c62',
                homeRoom: 'E26S19'
            }
        ];
        
            for (let remote of remoteConfig) {
                let remoteContainer = Game.getObjectById(remote.containerId);
                let isContainerBuilt = remoteContainer &&
                    remoteContainer instanceof Structure &&
                    remoteContainer.structureType === STRUCTURE_CONTAINER;
            
                // Liste des builders pour cette remote
                let remoteBuilders = _.filter(Game.creeps, c =>
                    c.memory.role === 'remotebuilder' &&
                    c.memory.targetRoom === remote.targetRoom
                );
            
                // Liste des RH pour cette remote
                let remoteHarvesters = _.filter(Game.creeps, c =>
                    c.memory.role === 'remoteharvester' &&
                    c.memory.targetRoom === remote.targetRoom &&
                    c.memory.sourceId === remote.sourceId
                );
            
                // Liste des RT pour cette remote
                let remoteTransporters = _.filter(Game.creeps, c =>
                    c.memory.role === 'remotetransporter' &&
                    c.memory.targetRoom === remote.targetRoom &&
                    c.memory.containerId === remote.containerId
                );
            
                let roomObj = Game.rooms[remote.targetRoom];
                let sites = roomObj ? roomObj.find(FIND_CONSTRUCTION_SITES) : [];
            
                // === REMOTE HARVESTER ===
                if (remoteHarvesters.length === 0 && isContainerBuilt && canSpawn && Game.spawns['Spawn1'].spawning === null) {
                    Game.spawns['Spawn1'].spawnCreep(
                        [WORK, WORK, CARRY, MOVE, MOVE],
                        'RH-' + Game.time,
                        {
                            memory: {
                                role: 'remoteharvester',
                                targetRoom: remote.targetRoom,
                                sourceId: remote.sourceId,
                                containerId: remote.containerId,
                                homeRoom: remote.homeRoom
                            }
                        }
                    );
                    break;
                }
            
                // === REMOTE TRANSPORTER ===
                if (remoteTransporters.length === 0 && isContainerBuilt && canSpawn && Game.spawns['Spawn1'].spawning === null) {
                    Game.spawns['Spawn1'].spawnCreep(
                        [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
                        'RT-' + Game.time,
                        {
                            memory: {
                                role: 'remotetransporter',
                                targetRoom: remote.targetRoom,
                                containerId: remote.containerId,
                                homeRoom: remote.homeRoom
                            }
                        }
                    );
                    break;
                }
            
                // === REMOTE BUILDER ===
                let totalProgress = sites.reduce((sum, s) => sum + (s.progressTotal - s.progress), 0);
                if (
                    (!isContainerBuilt || (sites.length > 0)) &&
                    remoteBuilders.length < 2 &&
                    Game.spawns['Spawn1'].spawning === null
                ) {
                    Game.spawns['Spawn1'].spawnCreep(
                        [WORK, CARRY, MOVE, MOVE],
                        'RB-' + Game.time,
                        {
                            memory: {
                                role: 'remotebuilder',
                                targetRoom: remote.targetRoom,
                                homeRoom: remote.homeRoom
                            }
                        }
                    );
                    break;
                }
            }


    
        // En recovery : spawn d'abord un SH solide (>=400 énergie) pour relancer la prod d'énergie.
        if (recoveryMode && numSuperHarvester < quota_superharvester && room.energyAvailable >= 400) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('superharvester', room.energyAvailable), 'SH-', {memory: {role: 'superharvester', originalRole: 'superharvester', room: room.name}});
            return;
        }
        // Sécurité recovery ultra stricte
        if ((numHarvesters + numSuperHarvester) < sources.length && room.energyAvailable >= 200) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('harvester', room.energyAvailable), 'H-', {memory: {role: 'harvester', originalRole: 'harvester', room: room.name}});
            return;
        }
        // Production normale selon quotas
        if (numHarvesters < quota_harvester) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('harvester', room.energyAvailable), 'H-', {memory: {role: 'harvester', originalRole: 'harvester', room: room.name}});
        }
        else if (numSuperHarvester < quota_superharvester && room.energyAvailable >= 0.5 * room.energyCapacityAvailable) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('superharvester', room.energyAvailable), 'SH-', {memory: {role: 'superharvester', originalRole: 'superharvester', room: room.name}});
        }
        else if (numTransporter < quota_transporter && room.energyAvailable >= 0.5 * room.energyCapacityAvailable) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('transporter', room.energyAvailable), 'T-', {memory: {role: 'transporter', originalRole: 'transporter', room: room.name}});
        }
        else if (numBuilders < quota_builder && room.energyAvailable >= 0.5 * room.energyCapacityAvailable) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('builder', room.energyAvailable), 'B-️️', {memory: {role: 'builder', originalRole: 'builder', room: room.name}});
        }
        else if (numRepairers < quota_repairers && room.energyAvailable >= 0.5 * room.energyCapacityAvailable) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('repairer', room.energyAvailable), 'R-', {memory: {role: 'repairer', originalRole: 'repairer', room: room.name}});
        }
        else if (numUpgraders < quota_upgrader && room.energyAvailable >= 0.5 * room.energyCapacityAvailable) {
            spawnWithId(Game.spawns['Spawn1'], getBestBody('upgrader', room.energyAvailable), 'U-', {memory: {role: 'upgrader', originalRole: 'upgrader', room: room.name}});
        }
        else if (numFillers < quota_filler && room.energyAvailable >= 150) {
            spawnWithId(Game.spawns['Spawn1'], [CARRY, CARRY, MOVE], 'F-', {memory: {role: 'filler', originalRole: 'filler', room: room.name}});
        }
    }

    
    // --- Dispatch des rôles ---
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep, recoveryMode);
        }
        else if (creep.memory.role == 'superharvester') {
            roleSuperHarvester.run(creep, recoveryMode);
        }
        else if (creep.memory.role == 'transporter') {
            roleTransporter.run(creep, recoveryMode);
        }
        else if (creep.memory.role == 'builder') {
            roleBuilder.run(creep, recoveryMode);
        }
        else if (creep.memory.role == 'repairer') {
            roleRepairer.run(creep, recoveryMode);
        }
        else if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep, recoveryMode)
        }
        else if (creep.memory.role == 'filler') {
            roleFiller.run(creep);
        }
        if (creep.memory.role === 'remoteharvester') {
            roleRemoteHarvester.run(creep);
        }
        else if (creep.memory.role === 'remotetransporter') {
            roleRemoteTransporter.run(creep);
        }
        else if (creep.memory.role === 'remotebuilder') {
            roleRemoteBuilder.run(creep);
        }
    }

    // --- Build auto ---
    planBase(spawn);

    if (build_manager && build_manager.runRoads) build_manager.runRoads(spawn);
    if (build_manager && build_manager.runContainer) build_manager.runContainer(spawn);
    if (build_manager && build_manager.runRampart) build_manager.runRampart(spawn);
    
    // --- TOWER MANAGER ---
    if (tower_manager && tower_manager.run) tower_manager.run();

    // --- LOG ---
    let mainRoomName = Game.spawns['Spawn1'].room.name;
    
    // Toutes les rooms connues ou pertinentes (visibles ou remote targets)
    let allRoomNames = new Set(Object.keys(Game.rooms));
    
    // Ajout des targetRooms connues dans les creeps
    for (let creepName in Game.creeps) {
        const mem = Game.creeps[creepName].memory;
        if (mem.targetRoom) allRoomNames.add(mem.targetRoom);
        if (mem.homeRoom) allRoomNames.add(mem.homeRoom);
    }
    
    // Log de la room principale
    consoleLog.logFullRoomStatus(mainRoomName, true);
    
    // Log des autres rooms
    for (let roomName of allRoomNames) {
        if (roomName !== mainRoomName) {
            consoleLog.logFullRoomStatus(roomName, false);
        }
    }

    // --- BENCHMARK ---
    stats_benchmark.run(room);
};
