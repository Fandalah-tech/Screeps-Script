// role.defender.js
module.exports = {
    run: function(creep) {
        const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        
        if (hostile) {
            // Reste à distance si hostile possède du ranged_attack
            if (hostile.getActiveBodyparts(RANGED_ATTACK) > 0) {
                if (creep.pos.getRangeTo(hostile) <= 3) {
                    creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
                    creep.attack(hostile);
                } else {
                    creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                if (creep.attack(hostile) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
                }
            }
        } else {
            // Aucun ennemi, le defender peut se replier
            creep.say('✅ clear');
            const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
            if (spawn) creep.moveTo(spawn, { visualizePathStyle: { stroke: '#888888' } });
        }
    }
};
