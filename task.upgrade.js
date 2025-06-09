function getAvailableUpgradeSpots(controller) {
    let spots = [];
    let room = controller.room;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let x = controller.pos.x + dx;
            let y = controller.pos.y + dy;
            let terrain = room.lookForAt(LOOK_TERRAIN, x, y)[0];
            if (terrain !== "wall") {
                let creepsHere = room.lookForAt(LOOK_CREEPS, x, y);
                if (!creepsHere.length) {
                    let isNearSource = room.find(FIND_SOURCES).some(src => Math.abs(src.pos.x - x) <= 1 && Math.abs(src.pos.y - y) <= 1);
                    if (!isNearSource) {
                        spots.push(new RoomPosition(x, y, room.name));
                    }
                }
            }
        }
    }
    return spots;
}

const SIGN_MSG = "Contrôlé par Gizmo! 🚀";

var Upgrade = {
    run: function(creep) {
        if (creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.task = null;
            return;
        }
        let ctrl = creep.room.controller;

        // --- SIGNAGE : si besoin, signe le controller avant d'upgrader
        let needsSign =
            !ctrl.sign ||
            ctrl.sign.text !== SIGN_MSG ||
            ctrl.sign.username !== creep.owner.username;
        if (needsSign) {
            if (creep.signController(ctrl, SIGN_MSG) === ERR_NOT_IN_RANGE) {
                creep.moveTo(ctrl, {visualizePathStyle: {stroke: '#00ffff'}});
                creep.say('sign');
            }
            return; // On fait l'action de signage, on ne fait pas d'upgrade ce tick
        }

        // --- UPGRADE : comportement classique
        if (creep.upgradeController(ctrl) === ERR_NOT_IN_RANGE) {
            creep.moveTo(ctrl, {visualizePathStyle: {stroke: '#ffffff'}});
            creep.say('upgrade');
        }
    }
};

module.exports = Upgrade;
