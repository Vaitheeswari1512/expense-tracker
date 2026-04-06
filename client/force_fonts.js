const fs = require('fs');
const path = require('path');

// 1. Create Custom Text Component
const textComponentPath = path.join(__dirname, 'src', 'components', 'Text.js');
const textComponentContent = `import React from 'react';
import { Text as RNText } from 'react-native';

export const Text = ({ style, ...props }) => {
  return (
    <RNText
      {...props}
      style={[
        style,
        { fontFamily: 'System', fontSize: 14 }
      ]}
    />
  );
};
`;
fs.writeFileSync(textComponentPath, textComponentContent);

// 2. Process Files
function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js') && file !== 'Text.js') {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Remove fontSize and fontFamily from StyleSheets and inline styles
            const fontSizeRegex = /fontSize\s*:\s*[0-9a-zA-Z_.]+\s*,?/g;
            const fontFamilyRegex = /fontFamily\s*:\s*['"][^'"]+['"]\s*,?/g;
            
            if (fontSizeRegex.test(content) || fontFamilyRegex.test(content)) {
                content = content.replace(fontSizeRegex, '');
                content = content.replace(fontFamilyRegex, '');
                modified = true;
            }

            // Calculate relative path to components/Text
            const depth = fullPath.split(path.sep).length - path.join(__dirname, 'src').split(path.sep).length;
            const relativeDots = depth > 1 ? '../'.repeat(depth - 1) : './';
            const componentImportPath = relativeDots + 'components/Text';

            // Replace import { ..., Text, ... } from 'react-native'
            if (content.includes("from 'react-native'") && content.includes('Text')) {
                // Regex to find Text in react-native import
                const rnImportRegex = /import\s+{([^}]*)}\s+from\s+['"]react-native['"];?/;
                const match = content.match(rnImportRegex);
                
                if (match) {
                    const imports = match[1].split(',').map(i => i.trim());
                    if (imports.includes('Text')) {
                        const newImports = imports.filter(i => i !== 'Text');
                        
                        let newImportString = '';
                        if (newImports.length > 0) {
                            newImportString = \`import { \${newImports.join(', ')} } from 'react-native';\\nimport { Text } from '\${componentImportPath}';\`;
                        } else {
                            newImportString = \`import { Text } from '\${componentImportPath}';\`;
                        }
                        
                        content = content.replace(rnImportRegex, newImportString);
                        modified = true;
                    }
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Processed:', fullPath);
            }
        }
    });
}

processDirectory(path.join(__dirname, 'src', 'screens'));
processDirectory(path.join(__dirname, 'src', 'components'));
processDirectory(path.join(__dirname, 'src', 'navigation'));

// 3. Apply TextInput Default Props in App.js
const appJsPath = path.join(__dirname, 'App.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Ensure TextInput default props are strictly set to [ { fontFamily: ... } ]
if (!appJsContent.includes('TextInput.defaultProps.style = [{')) {
    appJsContent = appJsContent.replace(
        /TextInput\.defaultProps\.style.*/g,
        "TextInput.defaultProps.style = [{ fontFamily: 'System', fontSize: 14 }];"
    );
    fs.writeFileSync(appJsPath, appJsContent);
}

console.log('Global font override complete.');
