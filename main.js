// === IMPORTATION DES MODULES ===
const build_manager  = require('module.build_manager');
const tower_manager  = require('module.tower_manager');
const console_log    = require('module.console_log');
const stats_benchmark    = require('stats_benchmark');
const { planBase } = require('module.plan_base');
const roleHarvester = require('role.harvester');
const roleSuperHarvester = require('role.superharvester')
const roleBuilder = require('role.builder');
const roleUpgrader = require('role.upgrader');
const roleTransporter = require('role.transporter');
const roleRepairer = require('role.repairer');

module.exports = {
    run: function(creep) {
        // === Changement d'état selon l'énergie ===
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
            creep.memory.repairing = true;
        }

        // === Phase réparation ===
        if (creep.memory.repairing) {
            // 1. Répare d'abord les ramparts (ou walls faibles)
            let target = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
                    s.hits < 2000 // à ajuster selon ta stratégie !
            }).sort((a, b) => a.hits - b.hits)[0];

            // 2. Sinon, répare toute autre structure abîmée
            if (!target) {
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: s => s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
                });
            }

            if (target) {
                if (creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#aaffaa'}});
                }
            } else {
                // Si rien à réparer, tu peux le faire upgrader ou idle :
                creep.memory.role = 'upgrader';
            }
            return;
        }

        // === Phase recharge ===
        // Prend l'énergie là où tu veux (container à proximité du spawn ou extensions)
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER ||
                 s.structureType === STRUCTURE_STORAGE ||
                 s.structureType === STRUCTURE_EXTENSION ||
                 s.structureType === STRUCTURE_SPAWN) &&
                s.store[RESOURCE_ENERGY] > 0
        });
        if (targets.length > 0) {
            if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    }
};

const utils = require('module.utils');

const getFreeSpacesAroundSource = utils.getFreeSpacesAroundSource;
const room = Game.spawns['Spawn1'].room;
const ctrlLevel = room.controller.level;
const sources = room.find(FIND_SOURCES);

let hasAllContainers = (room.find(FIND_SOURCES).every(source => {
    // Vérifie qu’il y a un container adjacent à chaque source
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
}));

// Calcule la capacité max et l’énergie totale
const containers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER });
const spawnAndExtensions = room.find(FIND_STRUCTURES, {
    filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION)
});
const totalCapacity = containers.reduce((acc, s) => acc + s.store.getCapacity(RESOURCE_ENERGY), 0)
    + spawnAndExtensions.reduce((acc, s) => acc + s.store.getCapacity(RESOURCE_ENERGY), 0);
const totalEnergy = containers.reduce((acc, s) => acc + s.store[RESOURCE_ENERGY], 0)
    + spawnAndExtensions.reduce((acc, s) => acc + s.store[RESOURCE_ENERGY], 0);

//Quotas Harvester / SuperHarvester et Transporter
let quota_harvester = 0;
let quota_transporter = 0;
let quota_superharvester = 0;

if(hasAllContainers){
    quota_superharvester = sources.length;
    quota_transporter = sources.length + 1;
} else {
    quota_harvester = sources.reduce((acc, source) => acc + getFreeSpacesAroundSource(source), 0);
    quota_harvester = Math.min(quota_harvester, 7); // max 7 harvesters, par exemple
}

//Quotas Builder
let quota_builder = 0;
if (ctrlLevel >= 2) {
    quota_builder = 1; // Ou plus si tu veux booster la construction en début RC2
    if (totalEnergy > totalCapacity * 0.80) {
        quota_builder++;
    }
    
    if(hasAllContainers){
    quota_builder *= 2;
    quota_builder = Math.min(quota_builder, 6); // max 6 builders 
    }
    
    else{
    quota_builder = Math.min(quota_builder, 3); // max 3 builders
    }
}

let quota_repairers = 1;

const quota_upgrader = ctrlLevel;

const quota_max = quota_harvester + quota_builder + quota_upgrader + quota_transporter + quota_superharvester;



// === MAIN LOOP ===
module.exports.loop = function () {
    tower_manager.run();
    build_manager.runRampart(Game.spawns['Spawn1']);

    // 1. Nettoyage mémoire
    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) delete Memory.creeps[name];
    }

    // 2. Spawn principal (version support multi-spawn si besoin)
    let spawn = Game.spawns['Spawn1'];
    if (!spawn) {
        let spawns = Object.values(Game.spawns);
        if (!spawns.length) {
            console.log('Erreur : pas de spawn trouvé');
            return;
        }
        spawn = spawns[0];
    }
    
    const room = spawn.room;

    // 3. QUOTAS (ajuste à ton goût)
    let numHarvesters = _.sum(Game.creeps, c => c.memory.role == 'harvester');
    let numSuperHarvesters = _.sum(Game.creeps, c => c.memory.role == 'superharvester');
    let numBuilders = _.sum(Game.creeps, c => c.memory.role == 'builder');
    let numUpgraders = _.sum(Game.creeps, c => c.memory.role == 'upgrader');
    let numTransporter = _.sum(Game.creeps, c => c.memory.role == 'transporter');
    let numRepairers = _.sum(Game.creeps, c => c.memory.role == 'repairer');
    
    const BASE = 113000; // À ajuster selon chaque serveur
    const name = Game.time - BASE; // donne des noms du genre H-22, H-23...

    console.log(`numBuilders: ${numBuilders}, quota_builder: ${quota_builder}, numSH: ${numSuperHarvesters}/${quota_superharvester}, numTransporters: ${numTransporter}/${quota_transporter}`);

    // S'assurer d'abord d'un minimum de harvesters
    if (numHarvesters < 3 && quota_superharvester == 0) {
        Game.spawns['Spawn1'].spawnCreep([WORK, WORK, CARRY, MOVE], 'H-' + name, {memory: {role: 'harvester'}});
    }
    // Puis, si on a besoin de superharvester et quota non atteint, on en fait un  
    else if (numSuperHarvesters < quota_superharvester) {
        Game.spawns['Spawn1'].spawnCreep([WORK, WORK, WORK, CARRY, MOVE], 'SH-' + name, {memory: {role: 'superharvester'}});
    }
    // Puis, si on a besoin de transporter et quota non atteint, on en fait un  
    else if (numTransporter < quota_transporter) {
        Game.spawns['Spawn1'].spawnCreep([CARRY, CARRY, MOVE, MOVE], 'T-' + name, {memory: {role: 'transporter'}});
    }
    // Puis, si quota builder non atteint, on en fait un
    else if (numBuilders < quota_builder) {
        Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, MOVE], 'B-' + name, {memory: {role: 'builder'}});
    }
    else if (numRepairers < quota_repairers) {
    Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, MOVE], 'R-' + name, {memory: {role: 'repairer'}});
    }
    // Puis, si quota upgrader non atteint, on en fait un
    else if (numUpgraders < quota_upgrader) {
        Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, MOVE], 'U-' + name, {memory: {role: 'upgrader'}});
    }
    // Ensuite, on termine le quota de harvesters restants
    else if (numHarvesters < quota_harvester) {
        Game.spawns['Spawn1'].spawnCreep([WORK, WORK, CARRY, MOVE], 'H-' + name, {memory: {role: 'harvester'}});
    }

    // 4. Dispatch
    // Passe quota_max à chaque builder lors du dispatch
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        } else if (creep.memory.role == 'superharvester') {
            roleSuperHarvester.run(creep);
        } else if (creep.memory.role == 'builder') {
            roleBuilder.run(creep, quota_max);
        } else if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        } else if (creep.memory.role == 'transporter') {
            roleTransporter.run(creep);
        }else if (creep.memory.role == 'repairer') {
            roleRepairer.run(creep);
        }
    }

    // 5. Build auto
    planBase(Game.spawns['Spawn1']);
    
    if (build_manager && build_manager.runRoads) build_manager.runRoads(spawn);
    if (build_manager && build_manager.runContainer) build_manager.runContainer(spawn);
    if (build_manager && build_manager.runRampart) build_manager.runRampart(spawn);

    // 6. LOGS (Room + Creeps, 1 tick sur 5 pour les creeps si trop verbeux)
    console_log.logRoomStatus(room);
    // Pour avoir le détail de chaque creep :
    console_log.logCreepDetails(room);
    
    stats_benchmark.run(room);
    // pour afficher console.log(JSON.stringify(Memory.benchmarks, null, 2))
    // pour supprimer delete Memory.benchmarks

};
