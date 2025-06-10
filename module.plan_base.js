// module.plan_base.js

// Tableau de layout à l'extérieur pour éviter les problèmes de scope
const LAYOUT = [
    //   dx, dy,    type
    [-3, 3, "route"], [-2, 3, "E"], [-1, 3, "E"], [0, 3, "route"], [1, 3, "E"], [2, 3, "E"], [3, 3, "route"],
    [-3, 2, "E"], [-2, 2, "route"], [-1, 2, "E"], [0, 2, "Tour1"], [1, 2, "E"], [2, 2, "route"], [3, 2, "E"],
    [-3, 1, "E"], [-2, 1, "E"], [-1, 1, "route"], [0, 1, "E"], [1, 1, "route"], [2, 1, "E"], [3, 1, "E"],
    [-3, 0, "route"], [-2, 0, "E"], [-1, 0, "E"], [0, 0, "route"], [1, 0, "E"], [2, 0, "E"], [3, 0, "route"],
    [-3, -1, "E"], [-2, -1, "E"], [-1, -1, "route"], [0, -1, "E"], [1, -1, "route"], [2, -1, "E"], [3, -1, "E"],
    [-3, -2, "E"], [-2, -2, "route"], [-1, -2, "E"], [0, -2, "Storage"], [1, -2, "E"], [2, -2, "route"], [3, -2, "E"],
    [-3, -3, "route"], [-2, -3, "E"], [-1, -3, "E"], [0, -3, "route"], [1, -3, "E"], [2, -3, "E"], [3, -3, "route"],
];

// Helper : vérifie que tous les chemins sont encore accessibles avec un bâtiment bloqué à (blockX, blockY)
function isPathAccessible(room, blockX, blockY, points) {
    let costMatrix = new PathFinder.CostMatrix();
    costMatrix.set(blockX, blockY, 255); // 255 = impassable
    for (const [from, to] of points) {
        let result = PathFinder.search(
            from,
            { pos: to, range: 1 },
            { roomCallback: () => costMatrix, maxOps: 1000 }
        );
        if (result.incomplete) return false;
    }
    return true;
}

function planBase(spawn, storagePos = null) {
    const room = spawn.room;
    const terrain = room.getTerrain();

    // Points critiques : spawn, controller, sources (+ storage si fourni)
    let points = [
        [spawn.pos, room.controller.pos],
    ];
    for (let source of room.find(FIND_SOURCES)) {
        points.push([spawn.pos, source.pos]);
    }
    if (storagePos) points.push([spawn.pos, storagePos]);

    for (const [dx, dy, type] of LAYOUT) {
        const x = spawn.pos.x + dx, y = spawn.pos.y + dy;
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        // On skip le spawn lui-même (déjà posé)
        // if (type === "S") continue;

        if (type === "Storage" && room.controller.level >= 4) {
            if (
                !room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_STORAGE) &&
                !room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_STORAGE) &&
                isPathAccessible(room, x, y, points)
            ) {
                room.createConstructionSite(x, y, STRUCTURE_STORAGE);
            }
        } else if (type === "Tour1" && room.controller.level >= 3) {
            if (
                !room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_TOWER) &&
                !room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_TOWER) &&
                isPathAccessible(room, x, y, points)
            ) {
                room.createConstructionSite(x, y, STRUCTURE_TOWER);
            }
        } else if (type === "E") {
            if (
                !room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_EXTENSION) &&
                !room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_EXTENSION) &&
                isPathAccessible(room, x, y, points)
            ) {
                room.createConstructionSite(x, y, STRUCTURE_EXTENSION);
            }
        } else if (type === "route") {
            if (
                !room.lookForAt(LOOK_STRUCTURES, x, y).length &&
                !room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length &&
                isPathAccessible(room, x, y, points)
            ) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD);
            }
        }
    }
}

module.exports = {
    planBase,
    LAYOUT
};
