// module.tower_manager.js
// Automatise la gestion et le comportement des Towers

const tower_manager = {
    run: function () {
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
                // 3. Réparation (hors murs/ramparts)
                const toRepair = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s =>
                        s.hits < s.hitsMax &&
                        s.structureType !== STRUCTURE_WALL &&
                        s.structureType !== STRUCTURE_RAMPART
                });
                if (toRepair) {
                    tower.repair(toRepair);
                }
            }
        }
    }
};

module.exports = tower_manager;
