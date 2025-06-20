// role.remoteharvester.js
const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.sourceId || !creep.memory.containerId) {
            // Recherche d'une source avec un container construit dans remote room
            const targetRoom = Game.rooms[creep.memory.remoteRoom];
            if (!targetRoom) return creep.moveTo(new RoomPosition(25, 25, creep.memory.remoteRoom));

            const containers = targetRoom.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            for (let container of containers) {
                const sources = container.pos.findInRange(FIND_SOURCES, 1);
                if (sources.length > 0) {
                    const taken = _.some(Game.creeps, c =>
                        c.name !== creep.name &&
                        c.memory.role === 'remoteharvester' &&
                        c.memory.containerId === container.id
                    );
                    if (!taken) {
                        creep.memory.sourceId = sources[0].id;
                        creep.memory.containerId = container.id;
                        break;
                    }
                }
            }

            // Si pas de container construit mais chantier en cours : aider à construire le container !
            const remoteRoom = Game.rooms[creep.memory.remoteRoom];
            if (!creep.memory.containerId && remoteRoom) {
                const containerSite = remoteRoom.find(FIND_CONSTRUCTION_SITES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                })[0];
            
                if (containerSite) {
                    // Si on n'a pas d'énergie, on ramasse ou on mine !
                    if (creep.store[RESOURCE_ENERGY] === 0) {
                        // Ramasser énergie au sol
                        const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
                        });
                        if (dropped.length > 0) {
                            dropped.sort((a, b) => b.amount - a.amount);
                            if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
                            }
                            return;
                        }
                        // Sinon miner la source la plus proche
                        const sources = creep.room.find(FIND_SOURCES);
                        if (sources.length > 0) {
                            if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#00ff00' } });
                            }
                            return;
                        }
                    } else {
                        // Construire le container !
                        if (creep.build(containerSite) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(containerSite, { visualizePathStyle: { stroke: '#ffffff' } });
                        }
                        return;
                    }
                }
            }





            if (!creep.memory.containerId) {
                // Park dans la remote room, dans un rayon de 4 autour du container ou du chantier
                const remoteRoom = Game.rooms[creep.memory.remoteRoom];
                let parkTarget = null;
                if (remoteRoom) {
                    const containers = remoteRoom.find(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    });
                    const sites = remoteRoom.find(FIND_CONSTRUCTION_SITES, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    });
                    parkTarget = containers[0] || sites[0];
                }
            
                if (parkTarget && creep.room.name === creep.memory.remoteRoom) {
                    // Cherche une case libre dans un rayon de 4 autour du container/site
                    let found = false;
                    for (let dx = -4; dx <= 4 && !found; dx++) {
                        for (let dy = -4; dy <= 4 && !found; dy++) {
                            if (Math.abs(dx) + Math.abs(dy) > 4) continue; // Manhattan radius 4
                            const x = parkTarget.pos.x + dx;
                            const y = parkTarget.pos.y + dy;
                            if (x < 1 || x > 48 || y < 1 || y > 48) continue; // évite les bords
                            if (creep.pos.x === x && creep.pos.y === y) {
                                found = true; // déjà bien placé
                                break;
                            }
                            const terrain = creep.room.lookForAt(LOOK_TERRAIN, x, y)[0];
                            const creepsHere = creep.room.lookForAt(LOOK_CREEPS, x, y);
                            if (terrain !== "wall" && creepsHere.length === 0) {
                                creep.moveTo(x, y, { visualizePathStyle: { stroke: '#888888' } });
                                found = true;
                            }
                        }
                    }
                    if (!found) {
                        // Pas de case dispo : se place à range 4
                        creep.moveTo(parkTarget, { range: 4, visualizePathStyle: { stroke: '#888888' } });
                    }
                } else {
                    // Park central dans la remote si aucun container/site trouvé ou pas encore dans la remote
                    if (creep.room.name !== creep.memory.remoteRoom) {
                        creep.moveTo(new RoomPosition(25, 25, creep.memory.remoteRoom), { visualizePathStyle: { stroke: '#888888' } });
                    } else {
                        creep.moveTo(25, 25, { visualizePathStyle: { stroke: '#888888' } });
                    }
                }
                return;
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        const container = Game.getObjectById(creep.memory.containerId);

        if (!source || !container) {
            delete creep.memory.sourceId;
            delete creep.memory.containerId;
            return;
        }

        if (!creep.pos.isEqualTo(container.pos)) {
            creep.moveTo(container.pos, { visualizePathStyle: { stroke: '#00ff88' } });
            return;
        }

        creep.harvest(source);
    }
};
