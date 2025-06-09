const MIN_UPGRADERS = 1;
const MIN_BUILDERS = 1;
const MIN_DEPOSITERS = 2;
const MIN_REPAIRERS = 0;
const MAX_BUILDERS = 4;
const MAX_DEPOSITERS = 4;
const MAX_REPAIRERS = 2;
const MAX_TRANSFERERS = 2;

const Worker = {
    run: function (creep) {
        // Réinitialisation des IDs cibles en cas de changement de tâche (sécurité)
        if (!creep.memory.task || creep.memory.lastTask !== creep.memory.task) {
            creep.memory.harvestTargetId = null;
            creep.memory.depositTargetId = null;
            creep.memory.buildTargetId = null;
            creep.memory.repairTargetId = null;
            creep.memory.upgradeTargetId = null;
            creep.memory.transferTargetId = null;
            creep.memory.lastTask = creep.memory.task;
        }

        // Si creep vide, toujours priorité à harvest
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = 'harvest';
            return;
        }

        // Comptage des rôles actifs
        const room = creep.room;
        let upgraders = _.sum(Game.creeps, c =>
            c.memory.role === 'worker' && c.memory.task === 'upgrade' && c.room.name === room.name
        );
        let builders = _.sum(Game.creeps, c =>
            c.memory.role === 'worker' && c.memory.task === 'build' && c.room.name === room.name
        );
        let depositers = _.sum(Game.creeps, c =>
            c.memory.role === 'worker' && c.memory.task === 'deposit' && c.room.name === room.name
        );
        let repairers = _.sum(Game.creeps, c =>
            c.memory.role === 'worker' && c.memory.task === 'repair' && c.room.name === room.name
        );
        let transferers = _.sum(Game.creeps, c =>
            c.memory.role === 'worker' && c.memory.task === 'transfer' && c.room.name === room.name
        );

        let numSites = room.find(FIND_CONSTRUCTION_SITES).length;

        // Gestion d'urgence remparts/ramparts low hp (si codé dans canAssignRepair)
        if (this.canAssignRepair(room, true) && repairers < MAX_REPAIRERS) {
            creep.memory.task = 'repair';
            return;
        }

        // ---- QUOTAS activés après 7 creeps ----
        if (_.filter(Game.creeps, c => c.memory.role === 'worker' && c.room.name === room.name).length >= 7) {
            if (upgraders < MIN_UPGRADERS) {
                creep.memory.task = 'upgrade'; return;
            }
            if (this.needDeposit(room) && depositers < MIN_DEPOSITERS) {
                creep.memory.task = 'deposit'; return;
            }
            if (this.needBuild(room) && builders < Math.min(numSites, MAX_BUILDERS)) {
                creep.memory.task = 'build'; return;
            }
            if (this.needDeposit(room) && depositers < MAX_DEPOSITERS) {
                creep.memory.task = 'deposit'; return;
            }
            if (this.canAssignRepair(room) && repairers < MAX_REPAIRERS) {
                creep.memory.task = 'repair'; return;
            }
            if (this.needTransfer(room) && transferers < MAX_TRANSFERERS) {
                creep.memory.task = 'transfer'; return;
            }
            if (creep.memory.task === 'idle' && creep.store[RESOURCE_ENERGY] > 0) {
               //console.log(`[DEBUG1] ${creep.name} passe de idle à upgrade (E:${creep.store[RESOURCE_ENERGY]})`);
                creep.memory.task = 'upgrade'; return;
            }
            // En tout dernier recours, toujours upgrade si le creep a de l’énergie
            if (creep.memory.task === "idle" && creep.store[RESOURCE_ENERGY] > 0) {
                creep.memory.task = "upgrade_wait";
                return;
            }
            // Sinon vraiment rien à faire
            //console.log(`[DEBUG4] ${creep.name} idle forcé (E:${creep.store[RESOURCE_ENERGY]})`);
            creep.memory.task = 'idle';
        }
        
        // ---- QUOTAS désactivés avant 7 creeps ----
        else {
            // Rush deposit early pour accélérer la prod
            if (this.needDeposit(room)) {
                creep.memory.task = 'deposit'; return;
            }
            if (this.needBuild(room)) {
                creep.memory.task = 'build'; return;
            }
            if (this.canAssignRepair(room)) {
                creep.memory.task = 'repair'; return;
            }
            if (this.needTransfer(room)) {
                creep.memory.task = 'transfer'; return;
            }
            if (creep.memory.task === "idle" && creep.store[RESOURCE_ENERGY] > 0) {
                creep.memory.task = "upgrade_wait";
                return;
            }
            // En tout dernier recours, toujours upgrade si le creep a de l’énergie
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.memory.task = 'upgrade';
                return;
            }
            // Sinon vraiment rien à faire
            //console.log(`[DEBUG3] ${creep.name} idle forcé (E:${creep.store[RESOURCE_ENERGY]})`);
            creep.memory.task = 'idle';
        }
    },

    // --- Conditions d'attribution des tâches ---
    needBuild: function(room) {
        return room.find(FIND_CONSTRUCTION_SITES).length > 0;
    },
    needDeposit: function(room) {
        return room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_EXTENSION ||
                structure.structureType === STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
    },
    
    canAssignRepair: function(room, urgent = false) {
        // Tu peux spécialiser ici pour les ramparts/walls low HP (déjà fait dans ta version)
        let threshold = urgent ? 10000 : 0.8;
        return room.find(FIND_STRUCTURES, {
            filter: (structure) => (
                (structure.hits < structure.hitsMax * threshold &&
                (structure.structureType === STRUCTURE_RAMPART ||
                structure.structureType === STRUCTURE_WALL)) ||
                (structure.hits < structure.hitsMax && (
                    structure.structureType === STRUCTURE_ROAD ||
                    structure.structureType === STRUCTURE_CONTAINER ||
                    structure.structureType === STRUCTURE_TOWER
                ))
            )
        }).length > 0;
    },
    
    needTransfer: function(room) {
        return room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
    },

    // --- Dispatcher (execute le module approprié) ---
    dispatch: function(creep) {
        switch (creep.memory.task) {
            case 'harvest':      require('task.harvest').run(creep); break;
            case 'deposit':      require('task.deposit').run(creep); break;
            case 'build':        require('task.build').run(creep); break;
            case 'repair':       require('task.repair').run(creep); break;
            case 'upgrade':      require('task.upgrade').run(creep); break;
            case 'transfer':     require('task.transfert').run(creep); break;
            default:             // Idle
                break;
        }
    },
    
    isTaskValid: function(creep) {
        switch (creep.memory.task) {
            case 'harvest':
                return creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            case 'deposit':
                return creep.store[RESOURCE_ENERGY] > 0 && this.needDeposit(creep.room);
            case 'transfer':
                return creep.store[RESOURCE_ENERGY] > 0 && this.needTransfer(creep.room);
            case 'build':
                return creep.store[RESOURCE_ENERGY] > 0 && this.needBuild(creep.room);
            case 'repair':
                return creep.store[RESOURCE_ENERGY] > 0 && this.canAssignRepair(creep.room);
            case 'upgrade':
                return creep.store[RESOURCE_ENERGY] > 0;
            default:
                return false;
        }
    }

};

module.exports = Worker;
