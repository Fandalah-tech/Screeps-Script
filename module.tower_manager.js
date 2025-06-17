// module.tower_manager.js

module.exports = {
    run(room) {
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });

        for (const tower of towers) {
            // 1. Défense : attaquer hostile
            const hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (hostile) {
                tower.attack(hostile);
                continue;
            }

            // 2. Soin allié blessé
            const injured = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: c => c.hits < c.hitsMax
            });
            if (injured) {
                tower.heal(injured);
                continue;
            }

            // 3. Réparation structures critiques
            const repairTarget = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s =>
                    s.hits < s.hitsMax * 0.5 &&
                    s.structureType !== STRUCTURE_WALL &&
                    s.structureType !== STRUCTURE_RAMPART
            });
            if (repairTarget && tower.store[RESOURCE_ENERGY] > 500) {
                tower.repair(repairTarget);
            }
        }
    }
};