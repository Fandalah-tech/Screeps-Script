const { goToParking } = require('module.utils');

module.exports = {
    run: function(creep) {
        if (!creep.memory.filling) creep.memory.filling = false;

        // Si on n'a rien à transporter, on reste en mode refill (filling=false)
        if (creep.memory.filling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.filling = false;
            creep.say('🔄 refill');
        }
        // Dès qu'on a de l'énergie, on passe en mode filling
        if (!creep.memory.filling && creep.store.getFreeCapacity() === 0) {
            creep.memory.filling = true;
            creep.say('📦 haul');
        }

        const targetRoom = creep.memory.remoteRoom;
        const homeRoom = creep.memory.room;

        if (!targetRoom || !homeRoom) return;

        // === Rapporter l'énergie à la main room ===
        if (creep.memory.filling) {
            // Ne partir pour la main room QUE si on y va livrer (on a de l'énergie !)
            if (creep.room.name !== homeRoom) {
                creep.moveTo(new RoomPosition(25, 25, homeRoom), { visualizePathStyle: { stroke: '#ffffff' } });
                return;
            }
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_STORAGE ||
                     s.structureType === STRUCTURE_CONTAINER ||
                     s.structureType === STRUCTURE_SPAWN) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.pos.getRangeTo(creep) - b.pos.getRangeTo(creep));
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                goToParking(creep, { role: 'remotetransporter' });
            }
            return;
        }

        // === Go to remote to fetch energy ===
        if (creep.room.name !== targetRoom) {
            // Si on n'est pas dans la remote et qu'on n'a rien à rapporter, on y reste !
            creep.moveTo(new RoomPosition(25, 25, targetRoom), { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // 1. Essayer de prendre dans un container
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0
        });
        if (containers.length > 0) {
            console.log('debug1');
            containers.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if (creep.withdraw(containers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 2. Ramasser l'énergie au sol
        const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
        });
        if (dropped.length > 0) {
            console.log('debug2');
            dropped.sort((a, b) => b.amount - a.amount);
            if (creep.pickup(dropped[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped[0], { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 3. Se park dans un rayon de 3 autour du container (ou du chantier container)
        const targetContainer = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];
        const targetSite = creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];
        
        let parkTarget = targetContainer || targetSite;
        
        if (parkTarget) {
            // Liste des cases libres dans un rayon de 3 autour de la cible
            let found = false;
            for (let dx = -3; dx <= 3 && !found; dx++) {
                for (let dy = -3; dy <= 3 && !found; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) > 2) continue; // cercle de Manhattan radius 3
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
                        // Va s'y park
                        creep.moveTo(x, y, { visualizePathStyle: { stroke: '#888888' } });
                        found = true;
                    }
                }
            }
            if (!found) {
                // Pas de case dispo : se place à range 3
                creep.moveTo(parkTarget, { range: 3, visualizePathStyle: { stroke: '#888888' } });
            }
        } else {
            // Park central dans la remote si aucun container/site trouvé
            creep.moveTo(25, 25, { visualizePathStyle: { stroke: '#888888' } });
        }
        return;
    }    
};
