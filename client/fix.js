const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src/screens');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remove TouchableOpacity with toggleSidebar
    const regex1 = /<TouchableOpacity[^>]*onPress=\{toggleSidebar\}[^>]*>[\s\S]*?<\/TouchableOpacity>/g;
    content = content.replace(regex1, '');
    
    // Some lines might become empty or have trailing whitespace, but it doesn't matter much.
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${path.basename(filePath)}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

walkDir(screensDir);
console.log('Done cleaning screens!');
