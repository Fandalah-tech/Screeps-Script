var Build = {
    run: function(creep) {
        // Si le creep n'a plus d'énergie, il arrête la tâche
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = 'idle';
            creep.memory.buildTargetId = null; // Nettoyage de la cible
            return;
        }

        // Ordre de priorité : Rampart > Tower > Extension > Road > Container > Wall
        let priorities = [
            STRUCTURE_RAMPART,
            STRUCTURE_TOWER,
            STRUCTURE_EXTENSION,
            STRUCTURE_ROAD,
            STRUCTURE_CONTAINER,
            STRUCTURE_WALL
        ];

        let foundSite = false;
        for (let type of priorities) {
            let sites = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site) => site.structureType === type
            });

            if (sites.length > 0) {
                let site = creep.pos.findClosestByPath(sites);
                if (site) {
                    creep.memory.buildTargetId = site.id; // Mémorisation pour les logs
                    let result = creep.build(site);
                    if (result === ERR_NOT_IN_RANGE) {
                        creep.moveTo(site, {visualizePathStyle: {stroke: '#ffffff'}});
                        creep.say('build ' + type[0].toUpperCase());
                    }
                    foundSite = true;
                }
                break; // Ne regarde pas les types suivants
            }
        }

        // Si aucun chantier valide trouvé, reset la mémoire et la tâche
        if (!foundSite) {
            creep.memory.buildTargetId = null;
            creep.memory.task = 'idle';
        }
    }
};

module.exports = Build;
