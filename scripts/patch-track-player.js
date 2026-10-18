const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(
  __dirname,
  '../node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt',
);

if (!fs.existsSync(targetFile)) {
  console.log('[patch-track-player] MusicModule.kt not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Regex to find any expression body '= [whitespace/newlines] scope.launch {'
const targetRegex = /=\s*scope\.launch\s*\{/g;

if (!targetRegex.test(content)) {
  console.log('[patch-track-player] All coroutine methods in MusicModule.kt already use block bodies.');
  process.exit(0);
}

let result = content.includes('// TURBOMODULE_VOID_RETURN_PATCH')
  ? ''
  : '// TURBOMODULE_VOID_RETURN_PATCH\n';
let i = 0;
let patchCount = 0;

while (i < content.length) {
  targetRegex.lastIndex = i;
  const match = targetRegex.exec(content);
  if (!match) {
    result += content.slice(i);
    break;
  }

  const matchIdx = match.index;
  // Append content up to '='
  result += content.slice(i, matchIdx);
  result += '{\n        scope.launch {';
  i = matchIdx + match[0].length;

  let braceCount = 1;
  while (i < content.length && braceCount > 0) {
    const ch = content[i];
    if (ch === '{') braceCount++;
    else if (ch === '}') braceCount--;
    result += ch;
    i++;
  }

  result += '\n    }';
  patchCount++;
}

fs.writeFileSync(targetFile, result, 'utf8');
console.log(`[patch-track-player] Successfully patched ${patchCount} methods in MusicModule.kt`);
