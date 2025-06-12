function getBestBody(role, maxEnergy) {
    if (role === 'superharvester') {
        if (maxEnergy < 200) {
            return [WORK, CARRY, MOVE];
        }
        let body = [];
        let energy = maxEnergy - 100;
        let workParts = 0;
        while (energy >= 100) {
            body.push(WORK);
            workParts++;
            energy -= 100;
        }
        if (workParts === 0) {
            body.push(WORK);
        }
        body.push(CARRY, MOVE);
        return body;

    } else if (role === 'transporter') {
        // Ratio optimal 2 CARRY : 1 MOVE
        if (maxEnergy < 150) {
            return [CARRY, MOVE];
        }
        let body = [];
        let pairs = Math.floor(maxEnergy / 150); // nombre de paires possibles
        for (let i = 0; i < pairs; i++) {
            body.push(CARRY, CARRY, MOVE);
        }
        let rest = maxEnergy - pairs * 150;
        if (rest >= 100) {
            body.push(CARRY, MOVE); // On ne veut jamais de CARRY seul (jamais lent)
        }
        return body;

    } else if (role === 'builder' || role === 'repairer') {
        if (maxEnergy < 200) {
            return [WORK, CARRY, MOVE];
        }
        // Priorité au WORK, puis équilibre CARRY et MOVE
        let numWork = Math.floor((maxEnergy - 100) / 200) + 1; // toujours au moins 1 WORK
        let numCarry = Math.max(1, Math.floor((maxEnergy - numWork * 100) / 100)); // 1+ CARRY
        let numMove = Math.max(1, Math.ceil((numWork + numCarry) / 2)); // ratio 2:1 parts utiles:move
    
        let body = [];
        for (let i = 0; i < numWork; i++) body.push(WORK);
        for (let i = 0; i < numCarry; i++) body.push(CARRY);
        for (let i = 0; i < numMove; i++) body.push(MOVE);
        return body;

    } else if (role === 'upgrader') {
        if (maxEnergy < 300) {
            return [WORK, CARRY, MOVE]; // Mini U pour recovery
        }
        if (maxEnergy < 500) {
            return [WORK, WORK, CARRY, MOVE, MOVE]; // Moyen U si room moyenne
        }
        // Sinon, U classique “full”
        let body = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
        let energy = maxEnergy - 400;
        while (energy >= 100) {
            body.push(WORK);
            energy -= 100;
        }
        while (energy >= 50) {
            body.push(CARRY);
            energy -= 50;
        }
        return body;
        
    } else {
        // fallback générique pour tout le reste
        return [WORK, CARRY, MOVE];
    }
}
module.exports = { getBestBody };
