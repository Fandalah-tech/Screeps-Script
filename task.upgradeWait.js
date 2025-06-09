var UpgradeWait = {
    run: function(creep) {
        let room = creep.room;
        let controller = room.controller;

        // 1. Lister les tiles adjacentes "valides"
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

        // 2. Repérer les tiles occupées par d'autres creeps (ceux en upgrade OU upgrade_wait)
        let taken = _.map(
            _.filter(Game.creeps, c =>
                c.id !== creep.id &&
                (c.memory.task === 'upgrade' || c.memory.task === 'upgrade_wait') &&
                c.room.name === room.name
            ), c => c.pos.x + ',' + c.pos.y
        );
        let availableTiles = tiles.filter(t => !taken.includes(t.x + ',' + t.y));

        // 3. S'il a une tile assignée, la garder (si toujours libre)
        let myTarget = creep.memory.upgradeTile;
        if (!myTarget || taken.includes(myTarget.x + ',' + myTarget.y)) {
            if (availableTiles.length > 0) {
                creep.memory.upgradeTile = availableTiles[0];
                myTarget = availableTiles[0];
            } else {
                // Toutes les tiles sont prises
                creep.say('WAIT');
                return;
            }
        }

        // 4. MoveTo la tile désignée si pas déjà dessus
        if (creep.pos.x !== myTarget.x || creep.pos.y !== myTarget.y) {
            creep.moveTo(myTarget.x, myTarget.y, {visualizePathStyle: {stroke: '#ffff00'}});
            creep.say('goUp');
            return;
        }

        // 5. Une fois sur la tile, switch sur "upgrade"
        creep.memory.task = 'upgrade';
    }
};
module.exports = UpgradeWait;
