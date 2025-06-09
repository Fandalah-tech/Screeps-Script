// module.build_manager.js
// Automatise le placement des extensions, routes, containers, ramparts, tower.

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

const build_manager = {

runExtension: function (spawn) {
    const room = spawn.room;
    const rcl = room.controller.level;
    let extensionOffsets;
    if (rcl === 2) {
        extensionOffsets = [
            [ 0, -1 ], [ -1, 0 ], [ 1, 0 ], [ 0, 1 ], [ -2, 0 ]
        ];
    } else if (rcl === 3) {
        extensionOffsets = [
            [ 0, -1 ], [ -1, 0 ], [ 1, 0 ], [ 0, 1 ], [ -2, 0 ],
            [ 0, -2 ], [ 0 , 2 ], [2, 0 ], [ 0, -3 ], [ 0 , 3 ]
        ];
    } else if (rcl === 4) {
        extensionOffsets = [
            [ 0, -1 ], [ -1, 0 ], [ 1, 0 ], [ 0, 1 ], [ -2, 0 ],
            [ 0, -2 ], [ 0 , 2 ], [2, 0 ], [ 0, -3 ], [ 0 , 3 ],
            [ 3, 0 ], [ -3 , 0], [4, 0 ], [ -4, 0 ], [ 0 , 4 ],
            [ 0, 4 ], [ 1 , 4], [-1, 4 ], [ 4, 1 ], [ 4 , -1 ],
        ];
    } else {
        extensionOffsets = [];
    }
    for (const [dx, dy] of extensionOffsets) {
        const x = spawn.pos.x + dx;
        const y = spawn.pos.y + dy;
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        const terrain = room.getTerrain();
        if (terrain.get(x, y) === 'wall') continue;

        // *** AJOUT CRUCIAL ICI ***
        // Détruit toute route présente à l'emplacement
        let structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        for (let s of structures) {
            if (s.structureType === STRUCTURE_ROAD) {
                s.destroy();
            }
        }

        // Détruit tout site de construction parasite (autre que extension)
        let sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        for (let site of sites) {
            if (site.structureType !== STRUCTURE_EXTENSION) {
                site.remove();
            }
        }

        // *** FIN DU PATCH ***

        const hasStructure = room.lookForAt(LOOK_STRUCTURES, x, y).length > 0;
        const hasAnySite = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0;
        if (hasStructure || hasAnySite) continue;
        let result = room.createConstructionSite(x, y, STRUCTURE_EXTENSION);
        if (result === OK) {
            console.log('Extension construction site placed at', x, y);
            break;
        }
    }
},

    runRoads: function (spawn) {
        const room = spawn.room;
        let sources = room.find(FIND_SOURCES);

        // --- spawn -> controller
        let pathCtrl = PathFinder.search(
            spawn.pos, 
            {pos: room.controller.pos, range: 1},
            {
                plainCost: 2,
                swampCost: 2,
                roomCallback: function(roomName) {
                    let costs = new PathFinder.CostMatrix;
                    // Custom exclusions si besoin
                    return costs;
                }
            }
        ).path;

        for (let pos of pathCtrl) {
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

        // --- spawn -> sources
        for (let source of sources) {
            let pathSrc = PathFinder.search(
                spawn.pos, 
                {pos: source.pos, range: 1},
                {
                    plainCost: 2,
                    swampCost: 2,
                    roomCallback: function(roomName) {
                        let costs = new PathFinder.CostMatrix;
                        return costs;
                    }
                }
            ).path;

            for (let pos of pathSrc) {
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

        // --- sources -> controller
        for (let source of sources) {
            let pathSrcCtrl = PathFinder.search(
                source.pos,
                {pos: room.controller.pos, range: 1},
                {
                    plainCost: 2,
                    swampCost: 2,
                    roomCallback: function(roomName) {
                        let costs = new PathFinder.CostMatrix;
                        return costs;
                    }
                }
            ).path;

            for (let pos of pathSrcCtrl) {
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

        // --- Pave autour du controller et de chaque source
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

    runTower: function (spawn) {
        const room = spawn.room;
        const rcl = room.controller.level;
        if (rcl < 3) return;
        let hasTower = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_TOWER}).length > 0;
        let hasSite = room.find(FIND_CONSTRUCTION_SITES, {filter: s => s.structureType === STRUCTURE_TOWER}).length > 0;
        let hasRuin = room.find(FIND_RUINS, {filter: r => r.structure.structureType === STRUCTURE_TOWER}).length > 0;
        if (hasTower || hasSite || hasRuin) return;
        let x = spawn.pos.x - 2;
        let y = spawn.pos.y + 2;
        if (x < 1 || x > 48 || y < 1 || y > 48) return;
        const terrain = room.getTerrain();
        if (terrain.get(x, y) === 'wall') return;
        let hasStructure = room.lookForAt(LOOK_STRUCTURES, x, y).length > 0;
        let hasConstruction = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0;
        let hasRuins = room.lookForAt(LOOK_RUINS, x, y).length > 0;
        if (hasStructure || hasConstruction || hasRuins) return;
        let result = room.createConstructionSite(x, y, STRUCTURE_TOWER);
        if (result === OK) {
            console.log('Tower construction site placed at', x, y);
        }
    }
};

module.exports = build_manager;
