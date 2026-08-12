const fs = require('fs');

function inspectEnvKeys() {
  ['.env.local', '.env'].forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`=== Keys in ${file} ===`);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          console.log(" -", parts[0]);
        }
      });
    }
  });
}

inspectEnvKeys();
