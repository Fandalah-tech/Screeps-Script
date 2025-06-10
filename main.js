// === IMPORTATION DES MODULES ===
const build_manager  = require('module.build_manager');
const tower_manager  = require('module.tower_manager');
const console_log    = require('module.console_log');
const stats_benchmark    = require('stats_benchmark');
const { planBase } = require('module.plan_base');
const roleHarvester = require('role.harvester');
const roleBuilder = require('role.builder');
const roleUpgrader = require('role.upgrader');
const utils = require('module.utils');

const getFreeSpacesAroundSource = utils.getFreeSpacesAroundSource;
const room = Game.spawns['Spawn1'].room;
const ctrlLevel = room.controller.level;
const sources = room.find(FIND_SOURCES);

// Calcule la capacité max et l’énergie totale
const containers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER });
const spawnAndExtensions = room.find(FIND_STRUCTURES, {
    filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION)
});
const totalCapacity = containers.reduce((acc, s) => acc + s.store.getCapacity(RESOURCE_ENERGY), 0)
    + spawnAndExtensions.reduce((acc, s) => acc + s.store.getCapacity(RESOURCE_ENERGY), 0);
const totalEnergy = containers.reduce((acc, s) => acc + s.store[RESOURCE_ENERGY], 0)
    + spawnAndExtensions.reduce((acc, s) => acc + s.store[RESOURCE_ENERGY], 0);

// Calcule le nombre total d'emplacements harvesters
let quota_harvester = sources.reduce((acc, source) => acc + getFreeSpacesAroundSource(source), 0);
quota_harvester = Math.min(quota_harvester, 7); // max 5 harvesters, par exemple

let quota_builder = Math.max(ctrlLevel - 1, 1); // Si tu veux au moins 1 builder dès RC2
if (totalEnergy > totalCapacity * 0.80) { // Si >80% full
    quota_builder++;
}

const quota_upgrader = ctrlLevel;

const quota_max = quota_harvester + quota_builder + quota_upgrader;

// === MAIN LOOP ===
module.exports.loop = function () {
    tower_manager.run();

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
    let numBuilders = _.sum(Game.creeps, c => c.memory.role == 'builder');
    let numUpgraders = _.sum(Game.creeps, c => c.memory.role == 'upgrader');
    
    // S'assurer d'abord d'un minimum de harvesters
    if (numHarvesters < 3) {
        Game.spawns['Spawn1'].spawnCreep([WORK, WORK, CARRY, MOVE], 'Harvester' + Game.time, {memory: {role: 'harvester'}});
    }
    // Puis, si quota builder non atteint, on en fait un
    else if (numBuilders < quota_builder) {
        Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, MOVE], 'Builder' + Game.time, {memory: {role: 'builder'}});
    }
    // Puis, si quota upgrader non atteint, on en fait un
    else if (numUpgraders < quota_upgrader) {
        Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE, MOVE], 'Upgrader' + Game.time, {memory: {role: 'upgrader'}});
    }
    // Ensuite, on termine le quota de harvesters restants
    else if (numHarvesters < quota_harvester) {
        Game.spawns['Spawn1'].spawnCreep([WORK, WORK, CARRY, MOVE], 'Harvester' + Game.time, {memory: {role: 'harvester'}});
    }

    // 4. Dispatch
    // Passe quota_max à chaque builder lors du dispatch
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        } else if (creep.memory.role == 'builder') {
            roleBuilder.run(creep, quota_max); // <-- ici
        } else if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
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
