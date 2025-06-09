const Harvest  = require('task.harvest');
const Build    = require('task.build');
const Upgrade  = require('task.upgrade');
const Deposit  = require('task.deposit');
const Repair   = require('task.repair');
const Transfer = require('task.transfert');

const MIN_BUILDERS = 1;
const MIN_UPGRADERS = 1;
const QUOTA_ACTIVATION = 7; // seuil pour quotas
const CRITICAL_RAMPART_HP = 5500;
const WALL_REMPART_REPAIR_CAP = 10000;
const MIN_DEPOSITERS = 2;

const Worker = {
    run: function(creep) {
        // SÉCURITÉ : Si plus d'énergie, force HARVEST (pas de return bloquant ici !)
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = 'harvest';
            creep.memory.workingSourceId = null;
            creep.memory.depositTargetId = null;
            creep.memory.buildTargetId = null;
            creep.memory.repairTargetId = null;
            creep.memory.transferTargetId = null;
        }

        // ----- PRIORITÉ CRITIQUE REMPART -----
        // Cherche le rempart (ou mur) le plus bas sous 5000 HP
        let criticalRampart = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL)
                && s.hits < CRITICAL_RAMPART_HP
        }).sort((a,b) => a.hits - b.hits)[0];

        if (criticalRampart && creep.store[RESOURCE_ENERGY] > 0) {
            // Assure qu'au moins 1 creep est affecté à ce repair, priorité absolue
            let repairingCritical = _.filter(Game.creeps, c =>
                c.memory.role === 'worker' &&
                c.memory.task === 'repair' &&
                c.memory.repairTargetId === criticalRampart.id
            );
            if (repairingCritical.length < 1) {
                creep.memory.task = 'repair';
                creep.memory.repairTargetId = criticalRampart.id;
                return;
            }
        }

        // Nombre total de workers dans la room (pour l'activation des quotas)
        const totalWorkers = _.sum(Game.creeps, c => c.memory.role === 'worker' && c.room.name === creep.room.name);

        // Dispatch intelligent avec rush deposit puis quotas
        if (!creep.memory.task || !this.isTaskValid(creep, creep.memory.task)) {
            if (creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.task = 'harvest';
                creep.memory.workingSourceId = null;
                creep.memory.depositTargetId = null;
                creep.memory.buildTargetId = null;
                creep.memory.repairTargetId = null;
                creep.memory.transferTargetId = null;
            }

            // ---- RUSH DEPOSIT (moins de 7 creeps) ----
            if (totalWorkers < QUOTA_ACTIVATION) {
                if (this.needDeposit(creep.room)) {
                    creep.memory.task = 'deposit';
                    return;
                }
                creep.memory.task = 'upgrade';
                return;
            }

            // ---- QUOTAS ACTIVÉS (7 creeps et plus) ----

            // 1. Toujours au moins 1 upgrader
            let upgraders = _.sum(Game.creeps, c =>
                c.memory.role === 'worker' && c.memory.task === 'upgrade' && c.room.name === creep.room.name
            );
            if (upgraders < MIN_UPGRADERS) {
                creep.memory.task = 'upgrade';
                return;
            }
            
            // 2. Toujours au moins 2 depositer
            let depositers = _.sum(Game.creeps, c =>
                c.memory.role === 'worker' && c.memory.task === 'deposit' && c.room.name === creep.room.name
            );
            if (this.needDeposit(creep.room) && depositers < MIN_DEPOSITERS) {
                creep.memory.task = 'deposit';
                return;
            }
            
            // 3. Build prioritaire : tous les autres creeps
            if (this.needBuild(creep.room)) {
                creep.memory.task = 'build';
                return;
            }
            
            // 4. Deposit (pour tous les autres qui restent si encore place à remplir)
            if (this.needDeposit(creep.room)) {
                creep.memory.task = 'deposit';
                return;
            }

            // 5. Repair (standard, sauf priorité critique déjà traitée)
            if (this.canAssignRepair(creep.room)) {
                creep.memory.task = 'repair';
                return;
            }

            // 6. Upgrade (défaut si rien d'autre à faire)
            creep.memory.task = 'upgrade';
            return;
        }

        // Dispatch de la tâche courante
        try {
            if (creep.memory.task === 'harvest')     Harvest.run(creep);
            else if (creep.memory.task === 'deposit') Deposit.run(creep);
            else if (creep.memory.task === 'build')   Build.run(creep);
            else if (creep.memory.task === 'upgrade') Upgrade.run(creep);
            else if (creep.memory.task === 'repair')  Repair.run(creep);
            else if (creep.memory.task === 'transfer') Transfer.run(creep);
        } catch (e) {
            console.log(`Erreur sur ${creep.name} [${creep.memory.task}] : ${e.stack || e}`);
        }
    },

    isTaskValid: function(creep, task) {
        if (task === 'harvest') return creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        if (task === 'deposit') return creep.store[RESOURCE_ENERGY] > 0;
        if (task === 'build') return creep.store[RESOURCE_ENERGY] > 0;
        if (task === 'upgrade') return creep.store[RESOURCE_ENERGY] > 0;
        if (task === 'repair') return creep.store[RESOURCE_ENERGY] > 0;
        if (task === 'transfer') return creep.store[RESOURCE_ENERGY] > 0;
        return false;
    },

    needDeposit: function(room) {
        return room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_EXTENSION ||
                 structure.structureType === STRUCTURE_SPAWN ||
                 structure.structureType === STRUCTURE_TOWER) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        }).length > 0;
    },

    canAssignRepair: function(room) {
        return room.find(FIND_STRUCTURES, {
            filter: (structure) => (
                (
                    (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) &&
                    structure.hits < structure.hitsMax * 0.5
                ) ||
                (
                    (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) &&
                    structure.hits < WALL_REMPART_REPAIR_CAP
                )
            )
        }).length > 0;
    },

    needBuild: function(room) {
        return room.find(FIND_CONSTRUCTION_SITES).length > 0;
    }
};

module.exports = Worker;
