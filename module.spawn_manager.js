const bodyManager = require('module.body_manager');
const quotaManager = require('module.quota_manager');
const recoveryState = require('module.recovery_state');

const ROLE_ABBR = {
    harvester:   'H',
    superharvester: 'SH',
    upgrader:    'U',
    builder:     'B',
    repairer:    'R',
    transporter: 'T',
    filler:      'F',
    remoteharvester: 'RH',
    remotebuilder:   'RB',
    remotetransporter: 'RT',
    scout:       'S'
    // Ajoute d'autres rôles si tu en as
};

const spawnManager = {
    run(room, isMainRoom = false) {
        const spawns = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_SPAWN && !s.spawning
        });
        if (spawns.length === 0) return;

        const quotas = quotaManager.getQuotas(room, isMainRoom);
        const creepsInRoom = _.filter(Game.creeps, c => c.memory.room === room.name);
        const counts = _.countBy(creepsInRoom, c => c.memory.role);
        
        // === 🆘 Recovery mode ===
        const state = recoveryState.getRecoveryState(room);
        
        //console.log(`[SPAWN_MANAGER] Recovery state: ${state} | Creeps in room: ${creepsInRoom.length} | Energy: ${room.energyAvailable}`);

        if (state === 'critical' && room.energyAvailable >= 150) {
            const name = `H-RC-${Game.time % 1000}`;
            const result = spawns[0].spawnCreep([WORK, MOVE], name, {
                memory: { role: 'harvester', room: room.name }
            });
            if (result === OK) {
                console.log(`🆘 Recovery: critical → spawning ${name}`);
                return;
            }
        }
        
        if (state === 'intermediate' && room.energyAvailable >= 100) {
            const name = `T-RC-${Game.time % 1000}`;
            const result = spawns[0].spawnCreep([CARRY, MOVE], name, {
                memory: { role: 'transporter', room: room.name }
            });
            if (result === OK) {
                console.log(`🆘 Recovery: intermediate → spawning ${name}`);
                return;
            }
        }
        
        if (state === 'basic' && room.energyAvailable >= 200) {
            const name = `R-RC-${Game.time % 1000}`;
            const result = spawns[0].spawnCreep([WORK, CARRY, MOVE], name, {
                memory: { role: 'repairer', room: room.name }
            });
            if (result === OK) {
                console.log(`🆘 Recovery: basic → spawning ${name}`);
                return;
            }
        }
        
        if (state === 'intermediate' && room.energyAvailable >= 200) {
            const name = `B-RC-${Game.time % 1000}`;
            const result = spawns[0].spawnCreep([WORK, CARRY, MOVE], name, {
                memory: { role: 'builder', room: room.name }
            });
            if (result === OK) {
                console.log(`🆘 Recovery: intermediate → spawning ${name}`);
                return;
            }
        }
        
        // === 🤖 Logique normale ===
        if (state === 'critical' || state === 'intermediate' || state === 'basic') return;

        // === 🤖 Logique normale ===
        for (let role in quotas) {
            const needed = quotas[role];
            const current = counts[role] || 0;

            if (current < needed) {
                const energyCapacity = room.energyCapacityAvailable;
                
                const isRecovery = !!state;
                const useMaxEnergy = !isRecovery; // ❌ Désactiver pendant recovery
        
                const body = bodyManager.getBestBody(role, room.energyAvailable, {
                    useMaxEnergy,
                    energyCapacityAvailable: energyCapacity
                });
                
                const abbr = ROLE_ABBR[role] || role.substring(0, 2).toUpperCase();
                let number = Game.time % 1000;
                let name = `${abbr}-${number}`;
                
                // Si le nom existe déjà, on incrémente jusqu’à trouver un nom libre
                while (Game.creeps[name]) {
                    number = (number + 1) % 1000;
                    name = `${abbr}-${number}`;
                }
                const memory = {
                    role,
                    room: room.name,
                };
                // Patch : Ajoute la remoteRoom si besoin
                if (role.startsWith("remote") && role !== "remoteharvester" && role !== "remotebuilder" && role !== "remotetransporter") {
                    // rien à faire ici (si tu as d'autres rôles remote custom)
                }
                if (["remotebuilder","remoteharvester","remotetransporter"].includes(role)) {
                    // On va chercher la remote cible dans Memory.remoteMining
                    const remotes = Memory.remoteMining && Memory.remoteMining[room.name];
                    if (remotes && remotes.length > 0) {
                        // On prend la première remote "pending"
                        memory.remoteRoom = remotes[0].room;
                    }
                }

                const result = spawns[0].spawnCreep(body, name, { memory });
                if (result === OK) return; // Un spawn à la fois par tick
            }
        }
    }
};

module.exports = spawnManager;
