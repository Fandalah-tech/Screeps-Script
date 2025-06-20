// module.quota_manager.js

const utils = require('module.utils');
const recovery = require('module.recovery_state');

module.exports = {
    getQuotas(room) {
        
        const state = recovery.getRecoveryState(room);
        
        // --- Priorité stricte (ordre de spawn) ---
        const quotas = {};
        
        if (state === 'critical') {
            quotas.repairer = 0;
            quotas.builder = 0;
            quotas.upgrader = 0;
        }
        else if (state === 'basic') {
            quotas.repairer = 1;
            quotas.builder = 0;
            quotas.upgrader = 0;
        }
        else if (state === 'intermediate') {
            quotas.repairer = 1;
            quotas.builder = 1;
            quotas.upgrader = 0;
        }
        
        const ctrl = room.controller;
        const rcl = ctrl ? ctrl.level : 0;
        
        // 5. Superharvester : 1 par container valide (seulement à partir de RCL2+)
        quotas.superharvester = 0;
        let nbSHslots = 0;
        if (rcl >= 2) {
            nbSHslots = utils.getAvailableSuperHarvesterContainers(room).length;
            quotas.superharvester = nbSHslots;
        }

        // 1. Harvester : 2 tout le temps (meta) SAUF si SH pour chaque slot
        if (quotas.superharvester >= nbSHslots && nbSHslots > 0) {
            quotas.harvester = 0;
        } else {
            quotas.harvester = 2;
        }

        // 2. Upgrader : 2 tout le temps (meta)
        quotas.upgrader = 2;
        let energyReserve = 0;
        const containers = room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE)
                && s.store[RESOURCE_ENERGY] > 0
        });
        energyReserve = _.sum(containers, c => c.store[RESOURCE_ENERGY]);
        
        if (energyReserve > 1000) quotas.upgrader = 3;
        if (energyReserve > 2000) quotas.upgrader = 4;

        // 3. Transporter : 2 tout le temps
        quotas.transporter = 2;

        // 4. Builder : 2 uniquement s'il y a un chantier ET RCL2+
        quotas.builder = 0;
        if (rcl >= 2) {
            const sites = room.find(FIND_CONSTRUCTION_SITES);
            if (sites.length > 10) quotas.builder = 4;
            else if (sites.length > 5) quotas.builder = 3;
            else if (sites.length > 0) quotas.builder = 2;
            
            if (energyReserve > 500 && sites.length > 0) quotas.builder += 1;
            if (energyReserve > 1000 && sites.length > 5) quotas.builder += 1;
        }

        // 6. Filler : 1 dès qu'au moins un container est construit (et RCL2+)
        quotas.filler = 0;
        if (rcl >= 2) {
            const containers = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            if (containers.length > 0) quotas.filler = 1;
        }

        // 7. Repairer : basé sur les structures réellement endommagées (sauf container, mur, rempart)
        quotas.repairer = 0;
        if (rcl >= 2) {
            const damaged = room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.hits < s.hitsMax * 0.8 &&
                    s.structureType !== STRUCTURE_WALL &&
                    s.structureType !== STRUCTURE_RAMPART &&
                    s.structureType !== STRUCTURE_CONTAINER
            });
        
            // Ramparts < 10k = priorité early
            const weakRamparts = room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_RAMPART &&
                    s.hits < 10000
            });
        
            if (damaged.length > 0 || weakRamparts.length > 0) {
                quotas.repairer = rcl >= 3 ? 2 : 1;
            }
        }

        // --- Ajout d'autres quotas à RC3+ si besoin
        // quotas.scout = ...
        
        if (room.find(FIND_HOSTILE_CREEPS).length > 0) {
            quotas.builder = 0;
            quotas.upgrader = 0;
        }

        return quotas;
    }
};
