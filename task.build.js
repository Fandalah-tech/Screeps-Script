var Build = {
    run: function(creep) {
        // Si le creep n'a plus d'énergie, il arrête la tâche
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = null;
            creep.memory.buildTargetId = null; // Nettoyage de la cible
            return;
        }

        // Ordre de priorité : Rampart > Tower > Extension > Road > Container
        let priorities = [
            STRUCTURE_RAMPART,
            STRUCTURE_TOWER,
            STRUCTURE_EXTENSION,
            STRUCTURE_ROAD,
            STRUCTURE_CONTAINER
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

        // Si aucun chantier valide trouvé, reset la mémoire de la cible
        if (!foundSite) {
            creep.memory.buildTargetId = null;
        }
        // NE PAS remettre la tâche à null ici, le dispatch s'en charge si besoin
    }
};

module.exports = Build;
