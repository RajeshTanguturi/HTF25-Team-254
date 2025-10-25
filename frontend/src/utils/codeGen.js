
// frontend/src/utils/codeGen.js
/**
 * Frontend-side helpers to detect types and build starter code templates.
 * Mirrors the server's logic so generated starter code arguments align with server parsing.
 */

const detectType = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        return `${detectType(value[0])}[]`;
    }
    const t = typeof value;
    if (t === 'number') return 'number';
    if (t === 'string') return 'string';
    if (t === 'boolean') return 'boolean';
    return 'object';
};

export const parseInputToTypes = (inputStr) => {
    if (!inputStr || inputStr.trim() === '') return null;
    try {
        const parsed = JSON.parse(`[${inputStr}]`);
        if (!Array.isArray(parsed)) return null;
        return parsed.map(detectType);
    } catch (e) {
        // fallback: simple heuristic split
        const tokens = [];
        let buf = '';
        let depth = 0;
        let inQuote = false;
        for (let i = 0; i < inputStr.length; i++) {
            const ch = inputStr[i];
            if ((ch === '"' || ch === "'") && inputStr[i - 1] !== '\\') inQuote = !inQuote;
            if (!inQuote) {
                if (ch === '[' || ch === '{') depth++;
                if (ch === ']' || ch === '}') depth--;
                if (ch === ',' && depth === 0) {
                    tokens.push(buf.trim());
                    buf = '';
                    continue;
                }
            }
            buf += ch;
        }
        if (buf.trim() !== '') tokens.push(buf.trim());
        return tokens.map(t => {
            if (!isNaN(Number(t))) return 'number';
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return 'string';
            if (t.toLowerCase() === 'true' || t.toLowerCase() === 'false') return 'boolean';
            if (t.startsWith('[')) return 'any[]';
            return 'string';
        });
    }
};

const toCamelCase = (str) => {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
            index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, '');
};

const mapJsTypeToJava = (jsType) => {
    const mapping = {
        'number': 'int',
        'string': 'String',
        'boolean': 'boolean',
        'number[]': 'int[]',
        'string[]': 'String[]',
        'boolean[]': 'boolean[]',
        'number[][]': 'int[][]',
        'string[][]': 'String[][]',
    };
    return mapping[jsType] || 'Object';
};

export const generateStarterCode = (inputTypes = [], outputType = null, problemTitle = '') => {
    const argNames = inputTypes.map((_, i) => `arg${i + 1}`);

    // JS
    const jsArgs = argNames.join(', ');
    const jsStarter = `function solve(${jsArgs}) {\n  // Your logic here\n}`;

    // Python
    const pyArgs = argNames.join(', ');
    const pyStarter = `def solve(${pyArgs}):\n  # Your logic here\n  pass`;

    // Java
    const javaReturnType = outputType ? mapJsTypeToJava(outputType) : 'void';
    const javaArgs = inputTypes.map((type, i) => `${mapJsTypeToJava(type)} ${argNames[i]}`).join(', ');
    const javaStarter =
`import java.util.*; \nclass Solution {
    public ${javaReturnType} solve(${javaArgs}) {
        // Your logic here
    }
}`;

    return [
        { language: 'javascript', code: jsStarter },
        { language: 'python', code: pyStarter },
        { language: 'java', code: javaStarter },
    ];
};
