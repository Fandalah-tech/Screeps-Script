// module.build_manager.js
// Automatise le placement des extensions, routes, containers, ramparts, tower.

const { LAYOUT } = require('module.plan_base');


function buildRoadAround(room, center) {
    const roomName = center.pos.roomName;
    const terrain = new Room.Terrain(roomName);
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            // Évite la case centrale (le controller ou la source)
            if (dx === 0 && dy === 0) continue;
            let x = center.pos.x + dx;
            let y = center.pos.y + dy;
            // Exclut les bords de la room
            if (x < 1 || x > 48 || y < 1 || y > 48) continue;
            // Évite les murs
            const tile = terrain.get(x, y);
            if (tile === TERRAIN_MASK_WALL) continue;
            // Vérifie qu’il n’y a pas déjà une route ou chantier/ruin route
            let hasRoad = room.lookForAt(LOOK_STRUCTURES, x, y).some(s => s.structureType === STRUCTURE_ROAD);
            let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).some(s => s.structureType === STRUCTURE_ROAD);
            let hasRuin = room.lookForAt(LOOK_RUINS, x, y).length > 0;
            if (!hasRoad && !hasSite && !hasRuin) {
                room.createConstructionSite(x, y, STRUCTURE_ROAD);
            }
        }
    }
}

function getDonutCostMatrix(spawn) {
    let costs = new PathFinder.CostMatrix();
    for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
            let x = spawn.pos.x + dx, y = spawn.pos.y + dy;
            // Est-ce un corridor/route dans ton layout ?
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

const build_manager = {

    runRoads: function (spawn) {
        const room = spawn.room;
        const terrain = room.getTerrain();
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
    
        // Helper pour trouver la porte la plus proche d'une cible
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
    
        // Pour chaque cible, trace une route depuis la "porte" la plus proche
        for (let target of targets) {
            let exit = closestRouteExit(routeExits, target.pos);
            let path = PathFinder.search(exit, {pos: target.pos, range: 1},
                {
                    plainCost: 2,
                    swampCost: 5,
                    roomCallback: function(roomName) {
                        let costs = new PathFinder.CostMatrix;
                        return costs;
                    }
                }
            ).path;
    
            for (let pos of path) {
                let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                let hasBlockingStructure = structures.some(s => s.structureType !== STRUCTURE_ROAD);
                let hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
    
                let constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
                let hasSite = constructionSites.some(s => s.structureType === STRUCTURE_ROAD);
                let hasBlockingSite = constructionSites.some(s => s.structureType !== STRUCTURE_ROAD);
    
                let hasRuin = room.lookForAt(LOOK_RUINS, pos.x, pos.y).length > 0;
    
                if (!hasRoad && !hasSite && !hasRuin && !hasBlockingStructure && !hasBlockingSite) {
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
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
                        swampCost: 5,
                        roomCallback: function(roomName) {
                            if (roomName === room.name) return donutMatrix;
                            return false;
                        }
                    }
                ).path;
        
            for (let pos of path) {
                let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                let hasBlockingStructure = structures.some(s => s.structureType !== STRUCTURE_ROAD);
                let hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
        
                let constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
                let hasSite = constructionSites.some(s => s.structureType === STRUCTURE_ROAD);
                let hasBlockingSite = constructionSites.some(s => s.structureType !== STRUCTURE_ROAD);
        
                let hasRuin = room.lookForAt(LOOK_RUINS, pos.x, pos.y).length > 0;
        
                if (!hasRoad && !hasSite && !hasRuin && !hasBlockingStructure && !hasBlockingSite) {
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                }
            }
        }  
        
    
        // --- Optionnel : pave autour du controller et des sources
        buildRoadAround(room, room.controller);
        for (const source of sources) {
            buildRoadAround(room, source);
        }
    },


    runContainer: function (spawn) {
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
    
        // RC2 : 1 container par source
        if (rcl === 2) {
            for (let source of sources) {
                targetOrder.push({ type: 'source', object: source, order: 1 });
            }
        }
        // RC3+ : 1 container par source, puis 1 controller, puis 2e par source (jusqu'à 5)
        else if (rcl >= 3) {
            for (let source of sources) {
                targetOrder.push({ type: 'source', object: source, order: 1 });
            }
            targetOrder.push({ type: 'controller', object: ctrl, order: 1 });
            for (let source of sources) {
                targetOrder.push({ type: 'source', object: source, order: 2 });
            }
        }
    
        // On pose UN SEUL container par tick pour éviter le spam
        for (let tgt of targetOrder) {
            if (containerCount >= maxContainers) break;
            let pos = tgt.object.pos;
            let found = false;
            for (let dx = -1; dx <= 1 && !found; dx++) {
                for (let dy = -1; dy <= 1 && !found; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    let x = pos.x + dx, y = pos.y + dy;
                    if (x < 1 || x > 48 || y < 1 || y > 48) continue;
                    if (room.getTerrain().get(x, y) !== 0) continue;
                    let hasContainer = room.lookForAt(LOOK_STRUCTURES, x, y)
                        .some(s => s.structureType === STRUCTURE_CONTAINER);
                    let hasSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y)
                        .some(s => s.structureType === STRUCTURE_CONTAINER);
                    if (hasContainer || hasSite) continue;
    
                    // Nettoyage route/site parasite
                    let structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                    for (let s of structures) if (s.structureType === STRUCTURE_ROAD) s.destroy();
                    let sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                    for (let site of sites) if (site.structureType !== STRUCTURE_CONTAINER) site.remove();
    
                    let result = room.createConstructionSite(x, y, STRUCTURE_CONTAINER);
                    if (result === OK) {
                        containerCount++;
                        found = true;
                        console.log('[CONTAINER] Posé à', x, y, '(type:', tgt.type, 'ordre:', tgt.order, ')');
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
