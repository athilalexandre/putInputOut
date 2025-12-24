const fs = require('fs');
const path = require('path');

const SOUNDS_DIRS = [
    'F:\\discord sounds',
    'F:\\discord sounds\\ja usados'
];

const OUTPUT_FILE = path.join(__dirname, 'web', 'sounds.json');

function scan() {
    let sounds = [];

    // Sons Padrão (Links)
    sounds.push(
        { "name": "🎵 PutIn PutOut - Música de Conexão", "url": "https://www.youtube.com/watch?v=QUlMp1X1Gtk" },
        { "name": "Never Gonna Give You Up", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        { "name": "Coffin Dance", "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw" },
        { "name": "Bohemian Rhapsody - Queen", "url": "https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb" },
        { "name": "Imagine - John Lennon", "url": "https://open.spotify.com/track/7pKfPomDEeR4toDTtSDrq7" }
    );

    SOUNDS_DIRS.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                if (file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg')) {
                    const name = file
                        .replace(/\.[^/.]+$/, "")
                        .replace(/_/g, " ")
                        .replace(/-/g, " ")
                        .trim();

                    sounds.push({
                        name: name,
                        url: path.join(dir, file)
                    });
                }
            });
        }
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sounds, null, 2));
    console.log(`✅ Escaneado com sucesso! ${sounds.length} sons encontrados.`);
}

scan();
