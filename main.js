const roleHarvester = require('role.harvester');
const roleSuperHarvester = require('role.superharvester');
const roleTransporter = require('role.transporter');
const roleBuilder = require('role.builder');
const roleRepairer = require('role.repairer');
const roleUpgrader = require('role.upgrader');
const { planBase } = require('module.plan_base');
const build_manager = require('module.build_manager');
const console_log = require('module.console_log');
const stats_benchmark    = require('stats_benchmark');

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
    let creepname = Game.time - 130000;

    // --- Containers présents ? ---
    let hasAllContainers = sources.every(source => {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let x = source.pos.x + dx, y = source.pos.y + dy;
                if (room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER)) {
                    return true;
                }
            }
        }
        return false;
    });

    // --- Comptage ---
    let numHarvesters      = _.sum(Game.creeps, c => c.memory.originalRole == 'harvester'); // Pour softlock/transition
    let numSuperHarvester  = _.sum(Game.creeps, c => c.memory.role == 'superharvester');    // ACTUELS
    let numTransporter     = _.sum(Game.creeps, c => c.memory.role == 'transporter');
    let numBuilders        = _.sum(Game.creeps, c => c.memory.originalRole == 'builder');   // Pour quota builders, évite le débordement à cause du switch
    let numRepairers       = _.sum(Game.creeps, c => c.memory.role == 'repairer');
    let numUpgraders       = _.sum(Game.creeps, c => c.memory.role == 'upgrader');

    // --- Quotas ---
    let quota_harvester = 3; // Toujours 3 "historiques" max
    let quota_superharvester = hasAllContainers ? sources.length : 0;
    let quota_transporter = hasAllContainers ? sources.length + 1 : 0;
    let quota_builder = 0;
    let quota_repairers = 1;
    let quota_upgrader = ctrlLevel;

    // Builders dynamiques
    if (ctrlLevel >= 2) {
        quota_builder = 1;
        if (totalEnergy > totalCapacity * 0.80) {
            quota_builder++;
        }
        if (hasAllContainers) {
            quota_builder *= 2;
            quota_builder = Math.min(quota_builder, 6);
        } else {
            quota_builder = Math.min(quota_builder, 3);
        }
    }

    // Boost upgraders si full
    if (totalEnergy >= totalCapacity * 0.95) {
        quota_upgrader += 2;
    }
    
    // Deadlock anti-softlock (toujours garantir relance !)
    if (_.sum(Game.creeps, c => c.memory.originalRole == 'harvester') < 1 && room.energyAvailable >= 200) {
        Game.spawns['Spawn1'].spawnCreep(
            [WORK, CARRY, MOVE],
            'H-EMER-' + creepname,
            {memory: {role: 'harvester', originalRole: 'harvester'}}
        );
        return;
    }
    if (_.sum(Game.creeps, c => c.memory.originalRole == 'transporter') < 1 && room.energyAvailable >= 100) {
        Game.spawns['Spawn1'].spawnCreep(
            [CARRY, MOVE],
            'T-EMER-' + creepname,
            {memory: {role: 'transporter', originalRole: 'transporter'}}
        );
        return;
    }

    // --- Spawn order ---
    if (numHarvesters < quota_harvester) {
        Game.spawns['Spawn1'].spawnCreep(
            [WORK, WORK, CARRY, MOVE],
            'H-' + creepname,
            {memory: {role: 'harvester', originalRole: 'harvester'}}
        );
    }
    else if (numSuperHarvester < quota_superharvester) {
        Game.spawns['Spawn1'].spawnCreep(
            [WORK, WORK, WORK, CARRY, MOVE],
            'SH-' + creepname,
            {memory: {role: 'superharvester', originalRole: 'superharvester'}}
        );
    }
    else if (numTransporter < quota_transporter) {
        Game.spawns['Spawn1'].spawnCreep(
            [CARRY, CARRY, MOVE, MOVE],
            'T-' + creepname,
            {memory: {role: 'transporter', originalRole: 'transporter'}}
        );
    }
    else if (numBuilders < quota_builder) {
        Game.spawns['Spawn1'].spawnCreep(
            [WORK, CARRY, MOVE, MOVE],
            'B-' + creepname,
            {memory: {role: 'builder', originalRole: 'builder'}}
        );
    }
    else if (numRepairers < quota_repairers) {
        Game.spawns['Spawn1'].spawnCreep(
            [WORK, CARRY, MOVE, MOVE],
            'R-' + creepname,
            {memory: {role: 'repairer', originalRole: 'repairer'}}
        );
    }
    else if (numUpgraders < quota_upgrader) {
        Game.spawns['Spawn1'].spawnCreep(
            [WORK, CARRY, MOVE, MOVE],
            'U-' + creepname,
            {memory: {role: 'upgrader', originalRole: 'upgrader'}}
        );
    }

    // --- Dispatch des rôles ---
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        else if (creep.memory.role == 'superharvester') {
            roleSuperHarvester.run(creep);
        }
        else if (creep.memory.role == 'transporter') {
            roleTransporter.run(creep);
        }
        else if (creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
        else if (creep.memory.role == 'repairer') {
            roleRepairer.run(creep);
        }
        else if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
    }
    
    // --- Build auto ---
    spawn=Game.spawns['Spawn1'];
    planBase(spawn);
    
    if (build_manager && build_manager.runRoads) build_manager.runRoads(spawn);
    if (build_manager && build_manager.runContainer) build_manager.runContainer(spawn);
    if (build_manager && build_manager.runRampart) build_manager.runRampart(spawn);
    
    
    // --- LOG ---
    console_log.logRoomStatus(room);
    console_log.logCreepDetails(room);
    
    // --- BENCHMARK ---
    stats_benchmark.run(room);
    // pour afficher console.log(JSON.stringify(Memory.benchmarks, null, 2))
    // pour supprimer delete Memory.benchmarks
};
