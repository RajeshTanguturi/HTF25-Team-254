
export const detectType = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        // inspect inner element type (only the first element to infer)
        const innerType = detectType(value[0]);
        return `${innerType}[]`;
    }
    const t = typeof value;
    if (t === 'object') return 'object';
    if (t === 'number') {
        // Distinguish ints from floats? For mapping to Java, we'll keep as 'number'
        return 'number';
    }
    if (t === 'string') return 'string';
    if (t === 'boolean') return 'boolean';
    return 'object';
};

/**
 * Attempts several parsing strategies:
 * 1) JSON.parse(`[${inputStr}]`) -- best when input uses JSON syntax
 * 2) Replace single quotes with double quotes (naive) and try again
 * 3) Split by commas and treat tokens as primitive strings (fallback)
 *
 * Returns:
 * - null when parsing completely fails
 * - array of inferred types like ['string','number']
 */
export const parseInputToTypes = (inputStr) => {
    if (!inputStr || inputStr.trim() === '') return null;

    const tryParse = (s) => {
        try {
            const parsed = JSON.parse(s);
            return parsed;
        } catch (e) {
            return null;
        }
    };

    // First try as JSON array by wrapping with []
    let tryStr = `[${inputStr}]`;
    let parsed = tryParse(tryStr);

    if (!parsed) {
        // try converting single quotes to double quotes (covers many user inputs)
        const replaced = inputStr.replace(/'/g, '"');
        parsed = tryParse(`[${replaced}]`);
    }

    if (!parsed) {
        // fallback: split by comma outside brackets/quotes - naive but usable for simple inputs
        // We'll attempt a simple split that respects bracket depth and quotes
        const tokens = [];
        let buf = '';
        let depth = 0;
        let inQuote = false;
        for (let i = 0; i < inputStr.length; i++) {
            const ch = inputStr[i];
            if (ch === '"' || ch === "'") {
                // toggle quote only if not escaped
                const prev = inputStr[i - 1];
                if (prev !== '\\') inQuote = !inQuote;
            }
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

        if (tokens.length === 0) return null;

        try {
            parsed = tokens.map(t => {
                // try to parse each token as JSON literal
                const attempt = tryParse(t);
                if (attempt !== null) return attempt;
                // try replacing single quotes & parse
                const attempt2 = tryParse(t.replace(/'/g, '"'));
                if (attempt2 !== null) return attempt2;
                // fallback: return as string (trim quotes)
                const trimmed = t.trim();
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                    return trimmed.substring(1, trimmed.length - 1);
                }
                // try number
                if (!isNaN(Number(trimmed))) return Number(trimmed);
                if (trimmed.toLowerCase() === 'true') return true;
                if (trimmed.toLowerCase() === 'false') return false;
                if (trimmed.toLowerCase() === 'null') return null;
                return trimmed;
            });
        } catch (e) {
            return null;
        }
    }

    if (!Array.isArray(parsed)) return null;

    // Map parsed values to types
    try {
        return parsed.map(detectType);
    } catch (e) {
        return null;
    }
};

/**
 * Map a JS-detected type string to a Java type.
 * This is conservative; complex objects map to Object.
 */
export const mapJsTypeToJava = (jsType) => {
    if (!jsType) return 'Object';
    const mapping = {
        'number': 'int', // most problems use ints; if float needed user can use double
        'string': 'String',
        'boolean': 'boolean',
        'number[]': 'int[]',
        'string[]': 'String[]',
        'boolean[]': 'boolean[]',
        'number[][]': 'int[][]',
        'string[][]': 'String[][]',
        'any[]': 'Object[]',
        'object': 'Object',
        'null': 'Object'
    };

    // handle nested arrays like 'number[][]' etc.
    if (mapping[jsType]) return mapping[jsType];
    if (jsType.endsWith('[]')) {
        const inner = jsType.slice(0, -2);
        const innerMap = mapJsTypeToJava(inner);
        if (innerMap === 'Object') return 'Object[]';
        return innerMap + '[]';
    }

    return mapping[jsType] || 'Object';
};
