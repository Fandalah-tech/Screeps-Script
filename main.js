// === IMPORTATION DES MODULES ===
const Worker         = require('role.worker');
const build_manager  = require('module.build_manager');
const tower_manager  = require('module.tower_manager');
const console_log    = require('module.console_log');
const stats_benchmark    = require('stats_benchmark');


// === ID UNIQUE WORKER (si jamais le compteur n'existe pas encore)
if (Memory.worker_id === undefined) Memory.worker_id = 1;

// === UTILS ===
function getBestBody(availableEnergy) {
    // Du plus gros au plus petit
    if (availableEnergy >= 800) return [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    if (availableEnergy >= 700) return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    if (availableEnergy >= 550) return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    if (availableEnergy >= 500) return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
    if (availableEnergy >= 450) return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
    if (availableEnergy >= 400) return [WORK, WORK, CARRY, MOVE, MOVE, MOVE];
    if (availableEnergy >= 350) return [WORK, WORK, CARRY, MOVE, MOVE];
    if (availableEnergy >= 300) return [WORK, CARRY, CARRY, MOVE, MOVE];
    return [WORK, CARRY, MOVE];
}

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

    // 3. Calcul nombre de workers souhaité
    const numSources = room.find(FIND_SOURCES).length;
    const hasSite = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    const RClvl = room.controller.level;
    const worker_needed = numSources * 3 + (hasSite ? 3 : 1) + RClvl;

    // 4. SPAWN au besoin
    const worker_count = _.sum(Game.creeps, c => c.memory.role === 'worker');
    const availableEnergy = room.energyAvailable;
    const body = getBestBody(availableEnergy);
    const cost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

    if (worker_count < worker_needed && availableEnergy >= cost) {
        let result = spawn.spawnCreep(
            body,
            'Worker' + Memory.worker_id,
            { memory: { role: 'worker' } }
        );
        if (result === OK) Memory.worker_id++;
    }

    // 5. Loop sur chaque creep worker
    for (let name in Game.creeps) {
        let creep = Game.creeps[name];
        if (creep.memory.role === 'worker') {
            Worker.run(creep);
        }
    }

    // 6. Build auto
    if (build_manager && build_manager.runExtension) build_manager.runExtension(spawn);
    if (build_manager && build_manager.runRoads) build_manager.runRoads(spawn);
    if (build_manager && build_manager.runContainer) build_manager.runContainer(spawn);
    if (build_manager && build_manager.runRampart) build_manager.runRampart(spawn);
    if (build_manager && build_manager.runTower) build_manager.runTower(spawn);

    // 7. LOGS (Room + Creeps, 1 tick sur 5 pour les creeps si trop verbeux)
    for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        console_log.logRoomStatus(room);      // log synthétique
        console_log.logTaskDetails(room);     // log détaillé (tous les 5 ticks)
    }
    
    stats_benchmark.run(room);
    // pour afficher console.log(JSON.stringify(Memory.benchmarks, null, 2))
    // pour supprimer delete Memory.benchmarks

};
