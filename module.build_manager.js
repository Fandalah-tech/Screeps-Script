// module.build_manager.js
// Automatise le placement des extensions, routes, containers, ramparts, tower.

const { LAYOUT } = require('module.plan_base');

// Nettoyage mémoire des locks de containers périmés
function cleanupPromisedContainers() {
    if (!Memory.promisedContainers) return;
    for (let key in Memory.promisedContainers) {
        if (Memory.promisedContainers[key] < Game.time) {
            delete Memory.promisedContainers[key];
        }
    }
}

function buildRoadAround(room, center) {
    const roomName = center.pos.roomName;
    const terrain = new Room.Terrain(roomName);
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let x = center.pos.x + dx;
            let y = center.pos.y + dy;
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            const tile = terrain.get(x, y);
            if (tile === TERRAIN_MASK_WALL) continue;

            // Lock mémoire
            let key = `${room.name},${x},${y}`;
            if (Memory.promisedContainers && Memory.promisedContainers[key] && Memory.promisedContainers[key] >= Game.time) continue;

            // Ne pose pas de route sur container/site container ou tout autre site
            let hasContainer = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER);
            let hasContainerSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER);
            let hasAnySite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0;
            if (hasContainer || hasContainerSite || hasAnySite) continue;

            let hasRoad = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_ROAD);
            let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_ROAD);
            let hasRuin = room.lookForAt(LOOK_RUINS, x, y).some(r => r.structure.structureType === STRUCTURE_ROAD);
            if (!hasRoad && !hasSite && !hasRuin) {
                if (isConnectedToRoad(room, x, y)) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD);
                }
            }
        }
    }
}

function getDonutCostMatrix(spawn) {
    let costs = new PathFinder.CostMatrix();
    for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
            let x = spawn.pos.x + dx, y = spawn.pos.y + dy;
            let isCorridor = LAYOUT.some(([lx, ly, type]) =>
                lx === dx && ly === dy && type === "route"
            );
            if (!isCorridor) {
                costs.set(x, y, 255); // cœur interdit
            }
        }
    }
    return costs;
}

function isConnectedToRoad(room, x, y) {
    // Renvoie true si au moins une des 8 cases autour de (x, y) contient une route (ou site de route)
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let tx = x + dx, ty = y + dy;
            if (tx < 1 || tx > 48 || ty < 1 || ty > 48) continue;
            let hasRoad = room.lookForAt(LOOK_STRUCTURES, tx, ty).some(s => s.structureType === STRUCTURE_ROAD);
            let hasRoadSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, tx, ty).some(s => s.structureType === STRUCTURE_ROAD);
            if (hasRoad || hasRoadSite) return true;
        }
    }
    return false;
}


const build_manager = {

    runRoads: function (spawn) {
        cleanupPromisedContainers();

        const room = spawn.room;
        let sources = room.find(FIND_SOURCES);

        // Liste des "portes" de sortie de ta base (corridors)
        const ROUTE_EXITS = [
            [-3, 3], [-3, -3], [3, 3], [3, -3]
        ];
        const routeExits = ROUTE_EXITS.map(([dx, dy]) =>
            new RoomPosition(spawn.pos.x + dx, spawn.pos.y + dy, spawn.room.name)
        );

        // Cibles vers lesquelles on veut une route principale
        const targets = [room.controller, ...sources];

        function closestRouteExit(routeExits, targetPos) {
            let min = null, minDist = Infinity;
            for (let pos of routeExits) {
                let dist = Math.abs(pos.x - targetPos.x) + Math.abs(pos.y - targetPos.y);
                if (dist < minDist) {
                    minDist = dist;
                    min = pos;
                }
            }
            return min;
        }

        for (let target of targets) {
            let exit = closestRouteExit(routeExits, target.pos);
            let path = PathFinder.search(exit, {pos: target.pos, range: 1},
                {
                    plainCost: 2,
                    swampCost: 2, //pour ignorer le fait que ce sont des swamps car on va construire dessus
                    roomCallback: function(roomName) {
                        let costs = new PathFinder.CostMatrix;
                        return costs;
                    }
                }
            ).path;

            for (let pos of path) {
                // LOCK
                let key = `${room.name},${pos.x},${pos.y}`;
                if (Memory.promisedContainers && Memory.promisedContainers[key] && Memory.promisedContainers[key] >= Game.time) continue;

                let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                let constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);

                let hasContainer = structures.some(s => s.structureType === STRUCTURE_CONTAINER);
                let hasContainerSite = constructionSites.some(s => s.structureType === STRUCTURE_CONTAINER);
                let hasAnySite = constructionSites.length > 0;
                if (hasContainer || hasContainerSite || hasAnySite) continue;

                let hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
                let hasSite = constructionSites.some(s => s.structureType === STRUCTURE_ROAD);
                let hasRuin = room.lookForAt(LOOK_RUINS, pos.x, pos.y).some(r => r.structure.structureType === STRUCTURE_ROAD);

                if (!hasRoad && !hasSite && !hasRuin) {
                    if (isConnectedToRoad(room, pos.x, pos.y)) {
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    }
                }
            }
        }

        let donutMatrix = getDonutCostMatrix(spawn);

        for (let source of sources) {
            let path = PathFinder.search(
                source.pos,
                {pos: room.controller.pos, range: 1},
                {
                    plainCost: 2,
                    swampCost: 2, //pour ignorer le fait que ce sont des swamps car on va construire dessus
                    roomCallback: function(roomName) {
                        if (roomName === room.name) return donutMatrix;
                        return false;
                    }
                }
            ).path;

            for (let pos of path) {
                // LOCK
                let key = `${room.name},${pos.x},${pos.y}`;
                if (Memory.promisedContainers && Memory.promisedContainers[key] && Memory.promisedContainers[key] >= Game.time) continue;

                let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                let constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);

                let hasContainer = structures.some(s => s.structureType === STRUCTURE_CONTAINER);
                let hasContainerSite = constructionSites.some(s => s.structureType === STRUCTURE_CONTAINER);
                let hasAnySite = constructionSites.length > 0;
                if (hasContainer || hasContainerSite || hasAnySite) continue;

                let hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
                let hasSite = constructionSites.some(s => s.structureType === STRUCTURE_ROAD);
                let hasRuin = room.lookForAt(LOOK_RUINS, pos.x, pos.y).some(r => r.structure.structureType === STRUCTURE_ROAD);

                if (!hasRoad && !hasSite && !hasRuin) {
                    if (isConnectedToRoad(room, pos.x, pos.y)) {
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    }
                }
            }
        }

        buildRoadAround(room, room.controller);
        for (const source of sources) {
            buildRoadAround(room, source);
        }
    },

    runContainer: function (spawn) {
        cleanupPromisedContainers();

        const room = spawn.room;
        const rcl = room.controller.level;
        const maxContainers = 5;

        let containerCount =
            room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length +
            room.find(FIND_CONSTRUCTION_SITES, { filter: s => s.structureType === STRUCTURE_CONTAINER }).length;

        if (containerCount >= maxContainers) return;

        let sources = room.find(FIND_SOURCES);
        let ctrl = room.controller;

        let targetOrder = [];

        if (rcl >= 2) {
            for (let source of sources) {
                targetOrder.push({ type: 'source', object: source, order: 1 });
            }
        }
        
        if (rcl >= 3) {
            targetOrder.push({ type: 'controller', object: ctrl, order: 1 });
        }

        for (let tgt of targetOrder) {
            if (containerCount >= maxContainers) break;
            let pos = tgt.object.pos;
        
            // Vérifier si la cible a déjà son container/site container à proximité
            let alreadyHasContainer = false;
            for (let dx = -1; dx <= 1 && !alreadyHasContainer; dx++) {
                for (let dy = -1; dy <= 1 && !alreadyHasContainer; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let x = pos.x + dx, y = pos.y + dy;
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    let hasContainer = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER);
                    let hasContainerSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER);
                    if (hasContainer || hasContainerSite) alreadyHasContainer = true;
                }
            }
            if (alreadyHasContainer) continue;
        
            // Maintenant seulement on essaie de poser un nouveau container (boucle identique à avant)
            let found = false;
            for (let dx = -1; dx <= 1 && !found; dx++) {
                for (let dy = -1; dy <= 1 && !found; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let x = pos.x + dx, y = pos.y + dy;
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    if (room.getTerrain().get(x, y) !== 0) continue;
        
                    // Place container uniquement sur une case libre (cf. logique précédente)
                    let structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    let canPlace = true;
                    for (let s of structures) {
                        if (
                            s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION ||
                            s.structureType === STRUCTURE_WALL ||
                            s.structureType === STRUCTURE_KEEPER_LAIR
                        ) {
                            canPlace = false;
                        }
                    }
                    if (!canPlace) continue;
        
                    for (let s of structures) {
                        if (
                            s.structureType !== STRUCTURE_SPAWN &&
                            s.structureType !== STRUCTURE_EXTENSION &&
                            s.structureType !== STRUCTURE_WALL &&
                            s.structureType !== STRUCTURE_KEEPER_LAIR
                        ) {
                            
                            console.log(`[DEBUG] Après destroy sur (${x},${y}): structures:`, JSON.stringify(room.lookForAt(LOOK_STRUCTURES, x, y).map(s => s.structureType)));

                            s.destroy();
                        }
                    }
                    let sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                    for (let site of sites) {
                        if (site.structureType !== STRUCTURE_CONTAINER) site.remove();
                    }
        
                    // Lock mémoire (verrou pour 3 ticks)
                    if (!Memory.promisedContainers) Memory.promisedContainers = {};
                    let key = `${room.name},${x},${y}`;
                    Memory.promisedContainers[key] = Game.time + 3;
        
                    let hasAnything =
                        room.lookForAt(LOOK_STRUCTURES, x, y).some(s =>
                            s.structureType !== STRUCTURE_SPAWN &&
                            s.structureType !== STRUCTURE_EXTENSION &&
                            s.structureType !== STRUCTURE_WALL &&
                            s.structureType !== STRUCTURE_KEEPER_LAIR
                        ) ||
                        room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(site => site.structureType !== STRUCTURE_CONTAINER);
        
                    if (hasAnything) continue;
        
                    if (
                        room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER) ||
                        room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_CONTAINER)
                    ) {
                        delete Memory.promisedContainers[key];
                    }
                    
                    if (!isConnectedToRoad(room, x, y)) continue; // On ne pose pas si pas connecté à une route
                    
                    
                    
                    
                    let result = room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                    if (result === OK) {
                        containerCount++;
                        found = true;
                        console.log('[CONTAINER] Posé à', x, y, '(type:', tgt.type, 'ordre:', tgt.order, ')');
                    } else {
                        console.log('[CONTAINER ERROR]', x, y, 'result:', result);
                    }
                }
            }
        }
    },


    runRampart: function (spawn) {
        const room = spawn.room;
        const rcl = room.controller.level;
        // spawn
        let hasRampart = room.lookForAt(LOOK_STRUCTURES, spawn.pos.x, spawn.pos.y).some(s => s.structureType === STRUCTURE_RAMPART);
        let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, spawn.pos.x, spawn.pos.y).some(s => s.structureType === STRUCTURE_RAMPART);
        let hasRuin = room.lookForAt(LOOK_RUINS, spawn.pos.x, spawn.pos.y).some(r => r.structure.structureType === STRUCTURE_RAMPART);
        if (!hasRampart && !hasSite && !hasRuin) {
            
            let result = room.createConstructionSite(spawn.pos.x, spawn.pos.y, STRUCTURE_RAMPART);
            if (result === OK) {
                console.log('Rampart construction site placed on spawn at', spawn.pos.x, spawn.pos.y);
            }
        }
        // towers et containers (RC3+)
        if (rcl >= 3) {
            var towers = room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_TOWER }
            });
            for (const tower of towers) {
                let x = tower.pos.x, y = tower.pos.y;
                let hasRampart = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_RAMPART);
                let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_RAMPART);
                let hasRuin = room.lookForAt(LOOK_RUINS, x, y).some(r => r.structure.structureType === STRUCTURE_RAMPART);
                if (!hasRampart && !hasSite && !hasRuin) {
                    let result = room.createConstructionSite(x, y, STRUCTURE_RAMPART);
                    if (result === OK) {
                        console.log('Rampart construction site placed on tower at', x, y);
                    }
                }
            }
            var containers = room.find(FIND_STRUCTURES, {
                filter: { structureType: STRUCTURE_CONTAINER }
            });
            for (const container of containers) {
                let x = container.pos.x, y = container.pos.y;
                let hasRampart = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_RAMPART);
                let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_RAMPART);
                let hasRuin = room.lookForAt(LOOK_RUINS, x, y).some(r => r.structure.structureType === STRUCTURE_RAMPART);
                if (!hasRampart && !hasSite && !hasRuin) {
                    let result = room.createConstructionSite(x, y, STRUCTURE_RAMPART);
                    if (result === OK) {
                        console.log('Rampart construction site placed on container at', x, y);
                    }
                }
            }
        }
        // extensions (RC4+)
        if (rcl >= 4) {
            var extensions = room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_EXTENSION }
            });
            for (const extension of extensions) {
                let x = extension.pos.x, y = extension.pos.y;
                let hasRampart = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_RAMPART);
                let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_RAMPART);
                let hasRuin = room.lookForAt(LOOK_RUINS, x, y).some(r => r.structure.structureType === STRUCTURE_RAMPART);
                if (!hasRampart && !hasSite && !hasRuin) {
                    let result = room.createConstructionSite(x, y, STRUCTURE_RAMPART);
                    if (result === OK) {
                        console.log('Rampart construction site placed on extension at', x, y);
                    }
                }
            }
        }
    },
};

module.exports = build_manager;