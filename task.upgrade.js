const SIGN_MSG = "Contrôlé par Gizmo! 🚀";

var Upgrade = {
    run: function(creep) {
        let room = creep.room;
        let controller = room.controller;

        // 1. Lister les tiles adjacentes "valides" autour du controller
        let tiles = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let x = controller.pos.x + dx;
                let y = controller.pos.y + dy;
                if (room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL) {
                    tiles.push({x, y});
                }
            }
        }

        // 2. Lister les tiles occupées par d'autres creeps qui upgradent
        let taken = _.map(
            _.filter(Game.creeps, c =>
                c.id !== creep.id &&
                c.memory.task === 'upgrade' &&
                c.room.name === room.name
            ), c => c.pos.x + ',' + c.pos.y
        );

        // 3. Choisir une tile dispo (ou garder celle déjà ciblée si toujours dispo)
        let myTarget = creep.memory.upgradeTile;
        let availableTiles = tiles.filter(t => !taken.includes(t.x + ',' + t.y));
        if (!myTarget || taken.includes(myTarget.x + ',' + myTarget.y)) {
            // Nouvelle affectation de tile si la précédente est prise ou pas définie
            if (availableTiles.length > 0) {
                creep.memory.upgradeTile = availableTiles[0];
                myTarget = availableTiles[0];
            } else {
                // Toutes les tiles sont occupées, attends le prochain tick
                creep.memory.task = "idle";
                return;
            }
        }

        // 4. Si plus d'énergie, passe en idle
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = "idle";
            creep.memory.upgradeTile = undefined;
            return;
        }

        // 5. Signage du controller si besoin
        let needsSign =
            !controller.sign ||
            controller.sign.text !== SIGN_MSG ||
            controller.sign.username !== creep.owner.username;
        if (needsSign) {
            if (creep.signController(controller, SIGN_MSG) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#00ffff'}});
                creep.say('sign');
            }
            return;
        }

        // 6. MoveTo la tile désignée si pas déjà dessus
        if (creep.pos.x !== myTarget.x || creep.pos.y !== myTarget.y) {
            creep.moveTo(myTarget.x, myTarget.y, {visualizePathStyle: {stroke: '#ffffff'}});
            creep.say('move');
            return;
        }

        // 7. Upgrade le controller si sur la bonne tile
        if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
            // Ne devrait jamais arriver, mais sécurité
            creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
        } else {
            creep.say('upgrade');
        }
    }
};

module.exports = Upgrade;
