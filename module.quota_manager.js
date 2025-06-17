// module.quota_manager.js

const utils = require('module.utils');

module.exports = {
    getQuotas(room) {
        const ctrl = room.controller;
        const rcl = ctrl ? ctrl.level : 0;
        const quotas = {};

        const baseQuotas = {
            harvester: 2,
            superharvester: 2,
            transporter: 2,
            builder: 2,
            upgrader: 2,
            repairer: 1,
            filler: 1
        };

        for (const role in baseQuotas) {
            quotas[role] = utils.shouldIncludeRole(role, room) ? baseQuotas[role] : 0;
        }

        return quotas;
    }
};

// Patch strict dans module.utils.js :
module.exports.shouldIncludeRole = function(role, room) {
    if (role === 'filler') return module.exports.shouldBuildFiller(room);
    if (role === 'repairer') return module.exports.shouldBuildRepairer(room);
    if (role === 'builder') {
        // Strict: builder seulement RCL2+ ET si chantier
        if (room.controller.level < 2) return false;
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        return sites.length > 0;
    }
    return true;
};