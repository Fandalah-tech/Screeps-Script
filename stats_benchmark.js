// stats_benchmark.js

function recordMilestone(room, key, value) {
    if (!Memory.benchmarks) Memory.benchmarks = {};
    if (!Memory.benchmarks[room.name]) Memory.benchmarks[room.name] = {};
    if (!Memory.benchmarks[room.name][key]) {
        Memory.benchmarks[room.name][key] = value !== undefined ? value : Game.time;
    }
}

module.exports = {
    run() {
        const cpuUsed = Game.cpu.getUsed().toFixed(2);
        const bucket = Game.cpu.bucket;
        const rooms = Object.values(Game.rooms).filter(r => r.controller && r.controller.my);
        const totalEnergy = rooms.reduce((sum, r) => sum + r.energyAvailable, 0);
        const creeps = Object.keys(Game.creeps).length;

        // === BENCHMARK HISTORIQUE / MILESTONES ===
        for (const room of rooms) {
            // Tick du premier spawn repéré (seulement sur tick très bas)
            if (Game.time < 100) {
                const spawns = room.find(FIND_MY_SPAWNS);
                if (spawns.length && (!Memory.benchmarks || !Memory.benchmarks[room.name] || !Memory.benchmarks[room.name].spawned)) {
                    recordMilestone(room, "spawned");
                }
            }
            // Passage de RCL
            const rcl = room.controller.level;
            for (let lvl = 1; lvl <= rcl; lvl++) {
                recordMilestone(room, `rcl${lvl}`);
            }
            // Extensions (5 construites)
            const extensions = room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType === STRUCTURE_EXTENSION });
            if (extensions.length >= 5) {
                recordMilestone(room, "first5Extensions");
            }
            // Premier container construit
            const containers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER });
            if (containers.length > 0) {
                recordMilestone(room, "firstContainer");
            }
            // Première tower construite
            const towers = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER });
            if (towers.length > 0) {
                recordMilestone(room, "firstTower");
            }
            // Première storage
            const storages = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_STORAGE });
            if (storages.length > 0) {
                recordMilestone(room, "firstStorage");
            }
            // Premier remote mining lancé (basé sur mémoire)
            if (Memory.remoteMining && Memory.remoteMining[room.name] && Memory.remoteMining[room.name].length > 0) {
                recordMilestone(room, "firstRemoteMining");
            }
        }

        // Log console synthétique toutes les 500 ticks
        if (Game.time % 500 === 0) {
            for (const roomName in Memory.benchmarks) {
                const milestones = Memory.benchmarks[roomName];
                let log = `📈 Milestones pour ${roomName}: `;
                for (const key of Object.keys(milestones)) {
                    log += `${key}:T${milestones[key]}  `;
                }
                console.log(log);
            }
        }

        // Benchmark classique (console toutes les 50 ticks comme avant)
        if (Game.time % 50 === 0) {
            console.log(`📊 Benchmark [T${Game.time}]`);
            console.log(`🧠 CPU: ${cpuUsed} / Bucket: ${bucket}`);
            console.log(`⚡ Énergie totale: ${totalEnergy}`);
            console.log(`👥 Creeps actifs: ${creeps}`);

            rooms.forEach(r => {
                console.log(`🏠 ${r.name} | RCL: ${r.controller.level} (${r.controller.progress}/${r.controller.progressTotal})`);
            });
        }
    }
};