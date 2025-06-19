// module.visual_debug.js

function drawMiningSlots(roomName) {
    if (!Memory.debug || !Memory.debug.visuals) return;
    const room = Game.rooms[roomName];
    if (!room || !Memory.miningSlots || !Memory.miningSlots[roomName]) return;

    const visual = new RoomVisual(roomName);

    // On numérote les slots dans l'ordre du tableau
    Memory.miningSlots[roomName].forEach((slot, i) => {
        const color =
            slot.role === 'superharvester' ? 'blue' :
            slot.takenBy ? 'red' : 'yellow';
    
        // Cercle de couleur, comme avant
        visual.circle(slot.x, slot.y, {
            fill: color,
            radius: 0.4,
            opacity: 0.5
        });
    
        // Numéro du slot, blanc, bien centré, SANS background
        visual.text(String(i + 1), slot.x, slot.y + 0.03, {
            font: "bold 0.5",
            color: "#fff",
            stroke: "#222",
            strokeWidth: 0.12,
            align: "center"
        });
    
        // Nom du creep, petit, discret, dessous (s'il y en a un)
        /**
        if (slot.takenBy) {
            visual.text(slot.takenBy, slot.x, slot.y + 0.38, {
                font: "0.3",
                color: "#ffb3b3",
                align: "center"
            });
        }
        **/
    });

}


function drawBaseLayout(roomName) {
    if (!Memory.debug || !Memory.debug.visuals) return;
    const room = Game.rooms[roomName];
    if (!room) return;

    // Patch : accepte plan dans Memory.rooms OU Memory.plan
    const plan = (
        (Memory.rooms[roomName] && Memory.rooms[roomName].basePlan)
        || (Memory.plan && Memory.plan[roomName])
    );
    if (!plan) return;

    const visual = new RoomVisual(roomName);

    for (const s of plan) {
        const type = s.structureType || s.type;
    
        // Ne pas afficher si la structure existe déjà sur cette case !
        if (room.lookForAt(LOOK_STRUCTURES, s.x, s.y).some(st => 
            (st.structureType || st.type) === type
        )) {
            continue;
        }
    
        let label = '?';
        let color = '#fff';
        let fill = undefined;
        let font = 0.5;

        switch (type) {
            case STRUCTURE_SPAWN:
            case 'spawn':
                label = 'S'; color = '#fff'; fill = '#222'; font = 0.7; break;
            case STRUCTURE_CONTAINER:
            case 'container':
                label = 'C'; color = '#4fc3f7'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_EXTENSION:
            case 'extension':
                label = 'E'; color = '#ffe082'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_TOWER:
            case 'tower':
                label = 'T'; color = '#ff9800'; fill = '#222'; font = 0.6; break;
            case STRUCTURE_ROAD:
            case 'road':
                // Mettre route en arrière-plan, très transparente
                visual.rect(s.x - 0.5, s.y - 0.5, 1, 1, { fill: '#888', stroke: '#444', opacity: 0.12 });
                continue;
            case STRUCTURE_RAMPART:
            case 'rampart':
                label = '🛡️'; color = '#66bb6a'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_STORAGE:
            case 'storage':
                label = 'ST'; color = '#4dd0e1'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_LINK:
            case 'link':
                label = 'L'; color = '#e040fb'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_TERMINAL:
            case 'terminal':
                label = 'TR'; color = '#b388ff'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_OBSERVER:
            case 'observer':
                label = 'O'; color = '#00bcd4'; fill = '#222'; font = 0.5; break;
            case STRUCTURE_NUKER:
            case 'nuker':
                label = 'N'; color = '#f44336'; fill = '#222'; font = 0.5; break;
        }

        // Dessine un cercle coloré puis un texte blanc par-dessus pour chaque structure
        if (type !== 'road' && type !== STRUCTURE_ROAD) {
            visual.circle(s.x, s.y, { fill: fill, stroke: color, radius: 0.4, opacity: 0.45 });
            visual.text(label, s.x, s.y + 0.07, {
                font: `bold ${font}`,
                color: color,
                stroke: "#111",
                strokeWidth: 0.13,
                align: "center"
            });
        }
    }

    visual.text('🧱 Base Layout', 1, 1, { align: 'left', color: '#ffa726', font: 0.5 });
}



function drawVisualOverlay(roomName) {
    drawMiningSlots(roomName);
    drawBaseLayout(roomName);
}

module.exports = {
    drawMiningSlots,
    drawBaseLayout,
    drawVisualOverlay
};
