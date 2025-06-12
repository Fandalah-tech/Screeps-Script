// module.tower_manager.js
// Gestion des Towers avec suivi persistant des cibles

const tower_manager = {
    run: function () {
        if (!Memory.towerRepairTargets) Memory.towerRepairTargets = {};

        for (const roomName in Game.rooms) {
            const towers = Game.rooms[roomName].find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_TOWER }
            });
            for (const tower of towers) {
                // 1. Défense
                const hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (hostile) {
                    tower.attack(hostile);
                    continue;
                }
                // 2. Soin
                const injured = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                    filter: c => c.hits < c.hitsMax
                });
                if (injured) {
                    tower.heal(injured);
                    continue;
                }
                // 3. Réparation "critiques" jusqu'à 100%
                let repairTarget = null;
                let memKey = tower.id;

                // Recherche ou mémorisation de la cible à réparer dans la mémoire globale
                if (Memory.towerRepairTargets[memKey]) {
                    let t = Game.getObjectById(Memory.towerRepairTargets[memKey]);
                    if (t && t.hits < t.hitsMax &&
                        t.structureType !== STRUCTURE_WALL &&
                        t.structureType !== STRUCTURE_RAMPART
                    ) {
                        repairTarget = t;
                    } else {
                        delete Memory.towerRepairTargets[memKey];
                    }
                }
                if (!repairTarget) {
                    // On cherche une nouvelle cible SOUS 40%
                    repairTarget = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s =>
                            s.hits < s.hitsMax * 0.4 &&
                            s.structureType !== STRUCTURE_WALL &&
                            s.structureType !== STRUCTURE_RAMPART
                    });
                    if (repairTarget) {
                        Memory.towerRepairTargets[memKey] = repairTarget.id;
                    }
                }
                // On répare la cible tant qu'elle n'est pas à fond
                if (repairTarget && repairTarget.hits < repairTarget.hitsMax) {
                    tower.repair(repairTarget);
                    return; // on n'agit que sur une cible à la fois
                }
                // Optionnel : ici tu pourrais ajouter une phase "entretien préventif" si tout est full.
            }
        }
    }
};

module.exports = tower_manager;
