module.exports = {
    getRecoveryState(room) {
        // N'active la recovery logic QUE pour RC2 et plus !
        if (!room.controller || room.controller.level < 2) return null;
        
        const creeps = _.filter(Game.creeps, c => c.memory.room === room.name);
        const total = creeps.length;
        const harvesters = creeps.filter(c => c.memory.role === 'harvester').length;
        const transporters = creeps.filter(c => c.memory.role === 'transporter').length;
    
        // --- États hiérarchisés ---
        if (total === 0) return 'critical';         // Aucune unité → redémarrage vital
        if (total <= 2 && harvesters < 2) return 'basic'; // Peu d'unités, manque de base
        if (total <= 3 && transporters < 1) return 'intermediate'; // Besoin de logistique
    
        return null; // Système stable
    },

    isRecovery(room) {
        return !!this.getRecoveryState(room);
    }
};
