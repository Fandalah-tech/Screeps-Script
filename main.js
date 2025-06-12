const roleHarvester = require('role.harvester');
const roleSuperHarvester = require('role.superharvester');
const roleTransporter = require('role.transporter');
const roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleUpgrader = require('role.upgrader');
const { planBase } = require('module.plan_base');
const build_manager = require('module.build_manager');
const console_log = require('module.console_log');
const stats_benchmark = require('stats_benchmark');
const { getBestBody } = require('module.body_manager');

if (!Memory.creepCounter) Memory.creepCounter = 0;
function getNextCreepId() {
    Memory.creepCounter = (Memory.creepCounter + 1) % 2000;
    return Memory.creepCounter;
}

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
    
    console.log("***************************************************************************");

    let room = Game.spawns['Spawn1'].room;
    let sources = room.find(FIND_SOURCES);
    let ctrlLevel = room.controller.level;
    let totalEnergy = room.energyAvailable;
    let totalCapacity = room.energyCapacityAvailable;
    let creepname = getNextCreepId();
    let spawn = Game.spawns['Spawn1'];

    // Comptage par rôle
    let numHarvesters      = _.sum(Game.creeps, c => c.memory.role == 'harvester');
    let numSuperHarvester  = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
    let numTransporter     = _.sum(Game.creeps, c => c.memory.role == 'transporter');
    let numBuildersActive  = _.sum(Game.creeps, c => c.memory.role === 'builder');
    let numBuildersTotal   = _.sum(Game.creeps, c => c.memory.originalRole === 'builder');
    let numRepairers       = _.sum(Game.creeps, c => c.memory.role == 'repairer');
    let numUpgraders       = _.sum(Game.creeps, c => c.memory.role == 'upgrader');
    
    // Flag recoveryMode global
    let recoveryMode = (numTransporter < 1 && numSuperHarvester < sources.length);

    // === Quotas dynamiques ===
    let quota_harvester = sources.length;
    let quota_superharvester = 0;
    let quota_transporter = 0;
    let quota_builder = 2;
    let quota_repairers = 1;
    let quota_upgrader = ctrlLevel;

    // Conversion dynamique builder <-> upgrader selon chantier
    let chantier = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    if (numBuildersActive < quota_builder && numBuildersTotal > 0 && chantier) {
        let requalifiable = _.find(Game.creeps, c =>
            c.memory.originalRole === 'builder' && c.memory.role !== 'builder'
        );
        if (requalifiable) {
            requalifiable.memory.role = 'builder';
            requalifiable.say('👷 build!');
        }
    }

    // 1. Nombre de sources avec container
    let sourcesWithContainer = sources.filter(source =>
        room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.pos.getRangeTo(source) <= 1
        }).length > 0
    ).length;
    
    // 2. Quotas dynamiques
    quota_superharvester = sourcesWithContainer;
    if (sourcesWithContainer === sources.length) {
        // Toutes les sources ont leur container → +1 transporter de support
        quota_transporter = sourcesWithContainer + 1;
    } else {
        // Progression linéaire
        quota_transporter = sourcesWithContainer;
    }

    // Bonus builder si énergie très pleine
    if (ctrlLevel >= 2 && totalEnergy > totalCapacity * 0.80) {
        quota_builder++;
    }
    if (totalEnergy >= totalCapacity * 0.95) {
        quota_upgrader += 2;
    }

    // +1 repair si containers/ramparts à réparer
    let critRep = getCriticalRepairCount(room);
    quota_repairers += Math.min(2, critRep);
    
    let canSpawn = !spawn.spawning; // Vérifie si le spawn est libre

    if (canSpawn) {
        // --- SÉCURITÉ recovery ultra stricte ---
        // 1. Toujours au moins 1 harvester ou superharvester par source
        if ((numHarvesters + numSuperHarvester) < sources.lengt && room.energyAvailable >= 200) {
            console.log('H-EMER à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('harvester', room.energyAvailable), 'H-EMER-' + creepname, {memory: {role: 'harvester', originalRole: 'harvester'}});
            return;
        }
        // 2. Ensuite au moins 2 builder EMER seulement si un harvester est présent
        if (numBuildersActive < quota_builder && room.energyAvailable >= 200) {
            console.log('B-EMER à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('builder', room.energyAvailable), 'B-EMER-' + creepname, {memory: {role: 'builder', originalRole: 'builder'}});
            // return;
        }
    
    
        // --- Production normale selon quotas ---
        if (numHarvesters < quota_harvester) {
            console.log('H à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('harvester', room.energyAvailable), 'H-' + creepname, {memory: {role: 'harvester', originalRole: 'harvester'}});
        }
        else if (numSuperHarvester < quota_superharvester) {
            console.log('SH à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('superharvester', room.energyAvailable), 'SH-' + creepname, {memory: {role: 'superharvester', originalRole: 'superharvester'}});
        }
        else if (numTransporter < quota_transporter) {
            console.log('T à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('transporter', room.energyAvailable), 'T-' + creepname, {memory: {role: 'transporter', originalRole: 'transporter'}});
        }
        else if (numBuildersActive < quota_builder && room.energyAvailable >= 200) {
            console.log('B à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('builder', room.energyAvailable), 'B-' + creepname, {memory: {role: 'builder', originalRole: 'builder'}});
        }
        else if (numRepairers < quota_repairers) {
            console.log('R à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('repairer', room.energyAvailable), 'R-' + creepname, {memory: {role: 'repairer', originalRole: 'repairer'}});
        }
        else if (numUpgraders < quota_upgrader) {
            console.log('U à venir...');
            Game.spawns['Spawn1'].spawnCreep(getBestBody('upgrader', room.energyAvailable), 'U-' + creepname, {memory: {role: 'upgrader', originalRole: 'upgrader'}});
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
    }

    // --- Build auto ---
    planBase(spawn);

    if (build_manager && build_manager.runRoads) build_manager.runRoads(spawn);
    if (build_manager && build_manager.runContainer) build_manager.runContainer(spawn);
    if (build_manager && build_manager.runRampart) build_manager.runRampart(spawn);

    // --- LOG ---
    console_log.logRoomStatus(room);
    //console_log.logCreepDetails(room);
    console.log(
    'QUOTAS - H:', numHarvesters,'/',quota_harvester,
    '  SH:', numSuperHarvester,'/',quota_superharvester,
    '  T:', numTransporter,'/',quota_transporter,
    '  B:', numBuildersTotal,'/',quota_builder,
    '  R:', numRepairers,'/',quota_repairers,
    '  U:', numUpgraders,'/',quota_upgrader
    );

    // --- BENCHMARK ---
    stats_benchmark.run(room);
};