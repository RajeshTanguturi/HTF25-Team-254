

// import { spawn } from 'child_process';
// import fs from 'fs/promises';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { nanoid } from 'nanoid';
// import { createHash } from 'crypto';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const tempDir = path.join(__dirname, '..', 'temp');

// // Persistent main compilation directories
// const mainSrcDir = path.join(tempDir, 'main_src');
// const mainBinDir = path.join(tempDir, 'main_bin');
// // Dedicated cache for compiled user solutions
// const compilationCacheDir = path.join(tempDir, 'java_cache');

// /* Configuration */
// const DEFAULT_LOCK_WAIT_MS = 30000;     // wait for another compiler to finish
// const DEFAULT_POLL_INTERVAL_MS = 150;   // poll interval while waiting
// const TMP_CLEANUP_AGE_MS = 1000 * 60 * 10; // remove tmp dirs older than 10 minutes during compile

// /* Global detected Java runtime target (string like '17') */
// let DETECTED_JAVA_RELEASE = null;

// /* Ensure base directories exist */
// const ensureDirs = async () => {
//   try {
//     await fs.mkdir(tempDir, { recursive: true });
//     await fs.mkdir(mainSrcDir, { recursive: true });
//     await fs.mkdir(mainBinDir, { recursive: true });
//     await fs.mkdir(compilationCacheDir, { recursive: true });
//   } catch (err) {
//     console.error('Failed to ensure base directories:', err);
//     throw err;
//   }
// };

// const spawnPromise = (command, args, opts = {}) => {
//   return new Promise((resolve, reject) => {
//     const child = spawn(command, args, opts);
//     let stdout = '', stderr = '';
//     if (child.stdout) child.stdout.on('data', d => stdout += d.toString());
//     if (child.stderr) child.stderr.on('data', d => stderr += d.toString());
//     child.on('error', err => reject(err));
//     child.on('close', code => resolve({ code, stdout, stderr }));
//   });
// };

// /* Detect runtime 'java -version' and extract major release (e.g., "17" or "21") */
// const detectJavaRuntimeRelease = async () => {
//   if (DETECTED_JAVA_RELEASE) return DETECTED_JAVA_RELEASE;
//   try {
//     // `java -version` prints to stderr in many JDK distributions; capture both
//     const res = await spawnPromise('java', ['-version']);
//     const out = (res.stdout || '') + (res.stderr || '');
//     const firstLine = (out.split('\n')[0] || '').trim();
//     // Typical lines:
//     // java version "17.0.8"  or openjdk version "21.0.2" or java version "1.8.0_xx"
//     const m = firstLine.match(/version\s+"([^"]+)"/i);
//     let versionStr = m ? m[1] : null;
//     if (!versionStr) {
//       // try alternative tokens
//       const tok = firstLine.split(' ')[2];
//       versionStr = tok || null;
//     }
//     if (versionStr) {
//       // handle "1.8.0_281" -> major 8
//       if (versionStr.startsWith('1.')) {
//         const parts = versionStr.split('.');
//         DETECTED_JAVA_RELEASE = parts.length >= 2 ? parts[1] : '8';
//       } else {
//         const parts = versionStr.split('.');
//         DETECTED_JAVA_RELEASE = parts[0];
//       }
//     } else {
//       DETECTED_JAVA_RELEASE = '17'; // fallback
//     }
//   } catch (err) {
//     DETECTED_JAVA_RELEASE = '17'; // fallback if detection fails
//   }
//   return DETECTED_JAVA_RELEASE;
// };

// /* Helper to try compiling with flags that ensure compatibility with the runtime.
//    Tries --release <target> first, then -source/-target, then plain javac as a fallback.
// */
// const runJavacWithCompatibility = async (sourcePath, destDir, targetRelease) => {
//   const candidates = [
//     ['-Xlint:none', '--release', targetRelease, '-d', destDir, sourcePath],
//     ['-Xlint:none', '-source', targetRelease, '-target', targetRelease, '-d', destDir, sourcePath],
//     ['-Xlint:none', '-d', destDir, sourcePath]
//   ];
//   let lastErr = null;
//   for (const args of candidates) {
//     try {
//       const res = await spawnPromise('javac', args, { cwd: path.dirname(sourcePath) });
//       if (res.code === 0) return res;
//       lastErr = res.stderr || res.stdout || `javac exit ${res.code}`;
//     } catch (err) {
//       lastErr = (err && err.message) ? err.message : String(err);
//     }
//   }
//   throw new Error(lastErr || 'javac failed');
// };

// /* ---------- Input parsing helpers (unchanged) ---------- */
// const parseInputStringToArgs = (inputStr) => {
//   if (inputStr === undefined || inputStr === null || inputStr === '') return [];
//   try {
//     return JSON.parse(`[${inputStr}]`);
//   } catch (e) {
//     try {
//       return JSON.parse(`[${inputStr.replace(/'/g, '"')}]`);
//     } catch (e2) {
//       const tokens = [];
//       let buf = '';
//       let depth = 0;
//       let inQuote = false;
//       for (let i = 0; i < inputStr.length; i++) {
//         const ch = inputStr[i];
//         if ((ch === '"' || ch === "'") && inputStr[i - 1] !== '\\') inQuote = !inQuote;
//         if (!inQuote) {
//           if (ch === '[' || ch === '{') depth++;
//           if (ch === ']' || ch === '}') depth--;
//           if (ch === ',' && depth === 0) {
//             tokens.push(buf.trim());
//             buf = '';
//             continue;
//           }
//         }
//         buf += ch;
//       }
//       if (buf.trim() !== '') tokens.push(buf.trim());
//       return tokens.map(tok => {
//         const t = tok.trim();
//         if (t === '') return '';
//         if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
//           return t.substring(1, t.length - 1);
//         if (t.toLowerCase() === 'true') return true;
//         if (t.toLowerCase() === 'false') return false;
//         if (t.toLowerCase() === 'null') return null;
//         if (!isNaN(Number(t))) return Number(t);
//         try { return JSON.parse(t); } catch (_) { return t; }
//       });
//     }
//   }
// };

// const buildAllInputsForTestCases = (testCases) => {
//   const all = testCases.map(tc => {
//     try { return parseInputStringToArgs(tc.input); }
//     catch (e) { return [tc.input]; }
//   });
//   return JSON.stringify(all);
// };

// /* ---------- Java runtime wrapper (Main.java) ---------- */
// /* This is your reflective Main runner — unchanged in behavior */
// const mainJavaContent = `
// import java.io.*;
// import java.lang.reflect.*;
// import java.util.*;

// public class Main {

//     static Object parseJsonValue(String s) {
//         if (s == null) return null;
//         s = s.trim();
//         if (s.length() == 0) return "";
//         if (s.equals("null")) return null;
//         if (s.equals("true")) return Boolean.TRUE;
//         if (s.equals("false")) return Boolean.FALSE;
//         if (s.length() >= 2) {
//             int c0 = (int) s.charAt(0);
//             int c1 = (int) s.charAt(s.length()-1);
//             if ((c0 == 39 && c1 == 39) || (c0 == 34 && c1 == 34)) {
//                 return unescapeJavaString(s.substring(1, s.length()-1));
//             }
//         }
//         if (s.startsWith("[") && s.endsWith("]")) {
//             String inner = s.substring(1, s.length()-1);
//             List<Object> list = new ArrayList<>();
//             if (inner.trim().length() == 0) return list;
//             int depth = 0;
//             boolean inQuote = false;
//             StringBuilder buf = new StringBuilder();
//             for (int i = 0; i < inner.length(); i++) {
//                 char c = inner.charAt(i);
//                 if ((int)c == 34 && (i == 0 || inner.charAt(i-1) != (char)92)) inQuote = !inQuote;
//                 if (!inQuote) {
//                     if (c == '[' || c == '{') depth++;
//                     if (c == ']' || c == '}') depth--;
//                     if (c == ',' && depth == 0) {
//                         list.add(parseJsonValue(buf.toString()));
//                         buf.setLength(0);
//                         continue;
//                     }
//                 }
//                 buf.append(c);
//             }
//             if (buf.length() > 0) list.add(parseJsonValue(buf.toString()));
//             return list;
//         }
//         try {
//             if (s.indexOf('.') >= 0) return Double.parseDouble(s);
//             else {
//                 try { return Integer.parseInt(s); } catch (NumberFormatException e) { return Long.parseLong(s); }
//             }
//         } catch (Exception e) {
//             if ((s.startsWith("\\\"") && s.endsWith("\\\"")) || (s.startsWith("\\'") && s.endsWith("\\'"))) return s.substring(1, s.length()-1);
//             return s;
//         }
//     }

//     static String unescapeJavaString(String s) {
//         StringBuilder sb = new StringBuilder();
//         for (int i = 0; i < s.length(); i++) {
//             char ch = s.charAt(i);
//             if ((int)ch == 92) {
//                 if (i+1 >= s.length()) { sb.append(ch); continue; }
//                 char next = s.charAt(i+1);
//                 if (next == 'n') { sb.append('\\n'); i++; continue; }
//                 if (next == 't') { sb.append('\\t'); i++; continue; }
//                 if (next == 'r') { sb.append('\\r'); i++; continue; }
//                 if (next == '"') { sb.append('"'); i++; continue; }
//                 if (next == '\\\\') { sb.append('\\\\'); i++; continue; }
//                 sb.append(next); i++; continue;
//             } else sb.append(ch);
//         }
//         return sb.toString();
//     }

//     static Object convertArg(Object parsed, Class<?> paramType) throws Exception {
//         if (paramType.isPrimitive()) {
//             if (paramType == int.class) {
//                 if (parsed instanceof Number) return ((Number)parsed).intValue();
//                 if (parsed instanceof String) return Integer.parseInt((String)parsed);
//             } else if (paramType == long.class) {
//                 if (parsed instanceof Number) return ((Number)parsed).longValue();
//                 if (parsed instanceof String) return Long.parseLong((String)parsed);
//             } else if (paramType == double.class) {
//                 if (parsed instanceof Number) return ((Number)parsed).doubleValue();
//                 if (parsed instanceof String) return Double.parseDouble((String)parsed);
//             } else if (paramType == boolean.class) {
//                 if (parsed instanceof Boolean) return parsed;
//                 if (parsed instanceof String) return Boolean.parseBoolean((String)parsed);
//             } else if (paramType == char.class) {
//                 if (parsed instanceof String && ((String)parsed).length() > 0) return ((String)parsed).charAt(0);
//             }
//         } else {
//             if (Number.class.isAssignableFrom(paramType)) {
//                 if (parsed instanceof Number) {
//                     Number n = (Number) parsed;
//                     if (paramType == Integer.class) return n.intValue();
//                     if (paramType == Long.class) return n.longValue();
//                     if (paramType == Double.class) return n.doubleValue();
//                     if (paramType == Float.class) return n.floatValue();
//                 }
//                 if (parsed instanceof String) {
//                     String str = (String) parsed;
//                     if (paramType == Integer.class) return Integer.valueOf(str);
//                     if (paramType == Long.class) return Long.valueOf(str);
//                     if (paramType == Double.class) return Double.valueOf(str);
//                     if (paramType == Float.class) return Float.valueOf(str);
//                 }
//             }
//             if (paramType == String.class) {
//                 if (parsed == null) return null;
//                 if (parsed instanceof String) return parsed;
//                 return String.valueOf(parsed);
//             }
//             if (paramType == Boolean.class) {
//                 if (parsed instanceof Boolean) return parsed;
//                 if (parsed instanceof String) return Boolean.valueOf((String)parsed);
//             }
//             if (paramType.isArray()) {
//                 Class<?> comp = paramType.getComponentType();
//                 if (parsed instanceof List) {
//                     List<?> lst = (List<?>) parsed;
//                     Object arr = Array.newInstance(comp, lst.size());
//                     for (int i = 0; i < lst.size(); i++) Array.set(arr, i, convertArg(lst.get(i), comp));
//                     return arr;
//                 }
//                 Object arr = Array.newInstance(comp, 1);
//                 Array.set(arr, 0, convertArg(parsed, comp));
//                 return arr;
//             }
//             if (List.class.isAssignableFrom(paramType) || Collection.class.isAssignableFrom(paramType)) {
//                 if (parsed instanceof List) return parsed;
//                 List<Object> l = new ArrayList<>();
//                 l.add(parsed);
//                 return l;
//             }
//             if (paramType == Object.class) return parsed;
//             if (parsed instanceof Number) {
//                 Number n = (Number) parsed;
//                 try {
//                     Method valueOf = paramType.getMethod("valueOf", String.class);
//                     return valueOf.invoke(null, n.toString());
//                 } catch (Exception ignore) {}
//             }
//         }
//         if (parsed == null) return null;
//         if (paramType.isInstance(parsed)) return parsed;
//         throw new IllegalArgumentException("Cannot convert " + parsed.getClass().getName() + " to " + paramType.getName());
//     }

//     static Object invokeSolveReflectively(Object solInstance, List<Object> argsList) throws Exception {
//         Method[] methods = solInstance.getClass().getDeclaredMethods();
//         List<Method> candidates = new ArrayList<>();
//         for (Method m : methods) if (m.getName().equals("solve")) candidates.add(m);

//         for (Method m : candidates) {
//             Class<?>[] pts = m.getParameterTypes();
//             if (pts.length == argsList.size()) {
//                 try {
//                     Object[] conv = new Object[pts.length];
//                     for (int i = 0; i < pts.length; i++) conv[i] = convertArg(argsList.get(i), pts[i]);
//                     m.setAccessible(true);
//                     return m.invoke(solInstance, conv);
//                 } catch (Exception e) {}
//             }
//         }

//         for (Method m : candidates) {
//             Class<?>[] pts = m.getParameterTypes();
//             if (pts.length == 1) {
//                 try {
//                     Object conv = convertArg(argsList, pts[0]);
//                     m.setAccessible(true);
//                     return m.invoke(solInstance, conv);
//                 } catch (Exception e) {}
//             }
//         }

//         for (Method m : candidates) {
//             if (m.isVarArgs()) {
//                 Class<?>[] pts = m.getParameterTypes();
//                 int fixed = pts.length - 1;
//                 if (argsList.size() >= fixed) {
//                     try {
//                         Object[] conv = new Object[pts.length];
//                         for (int i = 0; i < fixed; i++) conv[i] = convertArg(argsList.get(i), pts[i]);
//                         Class<?> varComp = pts[pts.length - 1].getComponentType();
//                         int varlen = argsList.size() - fixed;
//                         Object vararr = Array.newInstance(varComp, varlen);
//                         for (int i = 0; i < varlen; i++) Array.set(vararr, i, convertArg(argsList.get(fixed + i), varComp));
//                         conv[conv.length - 1] = vararr;
//                         m.setAccessible(true);
//                         return m.invoke(solInstance, conv);
//                     } catch (Exception e) {}
//                 }
//             }
//         }

//         for (Method m : candidates) {
//             if (m.getParameterTypes().length == 0) {
//                 m.setAccessible(true);
//                 return m.invoke(solInstance);
//             }
//         }

//         throw new NoSuchMethodException("No suitable solve(...) method found for provided arguments.");
//     }

//     static String toJsonLike(Object val) {
//         if (val == null) return "null";
//         if (val instanceof String) return quoteAndEscape((String)val);
//         if (val instanceof Boolean) return val.toString();
//         if (val instanceof Number) return val.toString();
//         if (val.getClass().isArray()) {
//             int len = Array.getLength(val);
//             StringBuilder sb = new StringBuilder();
//             sb.append("[");
//             for (int i = 0; i < len; i++) {
//                 if (i > 0) sb.append(",");
//                 sb.append(toJsonLike(Array.get(val, i)));
//             }
//             sb.append("]");
//             return sb.toString();
//         }
//         if (val instanceof Collection) {
//             Collection<?> c = (Collection<?>) val;
//             StringBuilder sb = new StringBuilder();
//             sb.append("[");
//             int i = 0;
//             for (Object o : c) {
//                 if (i++ > 0) sb.append(",");
//                 sb.append(toJsonLike(o));
//             }
//             sb.append("]");
//             return sb.toString();
//         }
//         if (val instanceof Map) {
//             Map<?, ?> m = (Map<?, ?>) val;
//             StringBuilder sb = new StringBuilder();
//             sb.append("{");
//             List<String> keys = new ArrayList<>();
//             for (Object k : m.keySet()) keys.add(String.valueOf(k));
//             Collections.sort(keys);
//             int i = 0;
//             for (String k : keys) {
//                 if (i++ > 0) sb.append(",");
//                 sb.append(quoteAndEscape(k)).append(":").append(toJsonLike(m.get(k)));
//             }
//             sb.append("}");
//             return sb.toString();
//         }
//         return quoteAndEscape(val.toString());
//     }

//     static String quoteAndEscape(String s) {
//         StringBuilder sb = new StringBuilder();
//         sb.append((char)34);
//         for (int i = 0; i < s.length(); i++) {
//             char ch = s.charAt(i);
//             if (ch == (char)34) { sb.append((char)92); sb.append((char)34); }
//             else if (ch == (char)92) { sb.append((char)92); sb.append((char)92); }
//             else if (ch == (char)10) { sb.append((char)92); sb.append('n'); }
//             else if (ch == (char)13) { sb.append((char)92); sb.append('r'); }
//             else if (ch == (char)9) { sb.append((char)92); sb.append('t'); }
//             else sb.append(ch);
//         }
//         sb.append((char)34);
//         return sb.toString();
//     }

//     public static void main(String[] args) {
//         BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
//         PrintWriter out = new PrintWriter(System.out);
//         try {
//             Class<?> solClass = null;
//             try { solClass = Class.forName("Solution"); } catch (ClassNotFoundException cnfe) {}
//             String line;
//             while ((line = br.readLine()) != null) {
//                 line = line.trim();
//                 if (line.length() == 0) continue;
//                 try {
//                     Object parsed = parseJsonValue(line);
//                     List<Object> argsList;
//                     if (parsed instanceof List) argsList = (List<Object>) parsed;
//                     else { argsList = new ArrayList<>(); argsList.add(parsed); }
//                     if (solClass == null) solClass = Class.forName("Solution");
//                     Object solInstance = solClass.getDeclaredConstructor().newInstance();
//                     Object result = invokeSolveReflectively(solInstance, argsList);
//                     out.println(toJsonLike(result));
//                 } catch (Throwable e) {
//                     StringWriter sw = new StringWriter();
//                     e.printStackTrace(new PrintWriter(sw));
//                     out.println("ERROR:" + sw.toString());
//                 }
//             }
//             out.flush();
//         } catch (IOException e) {
//             e.printStackTrace(System.err);
//         }
//     }
// }
// `;

// /* compile Main.java once */
// let mainCompiledPromise = null;
// const ensureMainCompiled = async () => {
//   if (mainCompiledPromise) return mainCompiledPromise;
//   mainCompiledPromise = (async () => {
//     await ensureDirs();
//     const mainJavaPath = path.join(mainSrcDir, 'Main.java');
//     await fs.writeFile(mainJavaPath, mainJavaContent, 'utf8');
//     const runtimeTarget = await detectJavaRuntimeRelease();
//     try {
//       await runJavacWithCompatibility(mainJavaPath, mainBinDir, runtimeTarget);
//     } catch (err) {
//       console.error('Retrying Main.java compilation...');
//       await new Promise(r => setTimeout(r, 200));
//       await runJavacWithCompatibility(mainJavaPath, mainBinDir, runtimeTarget);
//     }
//   })();
//   return mainCompiledPromise;
// };

// /* ---------- Normalization & utilities to reduce cache churn ---------- */
// const normalizeJavaSource = (src) => {
//   if (!src) return '';

//   // 1) normalize line endings
//   let s = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

//   // 2) remove 'package ...;' lines entirely (they cause class file path shifts)
//   s = s.replace(/^\s*package\s+[^;]+;.*$/mg, '');

//   // 3) convert "public class Solution" to "class Solution" to avoid public requirement
//   s = s.replace(/public\s+class\s+Solution/g, 'class Solution');

//   // 4) remove block comments and line comments (simple approach)
//   // NOTE: this is pragmatic and may remove comments inside string literals in rare cases.
//   s = s.replace(/\/\*[\s\S]*?\*\//g, '');     // block comments
//   s = s.replace(/\/\/[^\n\r]*/g, '');         // line comments

//   // 5) collapse whitespace sequences to single spaces and trim
//   s = s.replace(/\s+/g, ' ').trim();

//   return s;
// };

// /* check if directory contains any .class files recursively */
// const dirHasClassFiles = async (dir) => {
//   try {
//     const entries = await fs.readdir(dir, { withFileTypes: true });
//     for (const e of entries) {
//       const full = path.join(dir, e.name);
//       if (e.isDirectory()) {
//         if (await dirHasClassFiles(full)) return true;
//       } else if (e.isFile() && e.name.endsWith('.class')) return true;
//     }
//     return false;
//   } catch (e) {
//     return false;
//   }
// };

// /* remove stale tmp dirs that match pattern key.tmp-* older than threshold */
// const cleanupOldTmpDirs = async (cacheDir, key, ageMs = TMP_CLEANUP_AGE_MS) => {
//   try {
//     const items = await fs.readdir(cacheDir, { withFileTypes: true });
//     const now = Date.now();
//     for (const it of items) {
//       if (!it.isDirectory()) continue;
//       const nm = it.name;
//       if (!nm.startsWith(`${key}.tmp-`)) continue;
//       const full = path.join(cacheDir, nm);
//       try {
//         const st = await fs.stat(full);
//         if (now - st.mtimeMs > ageMs) {
//           await fs.rm(full, { recursive: true, force: true }).catch(() => {});
//         }
//       } catch (_) {}
//     }
//   } catch (_) {}
// };

// /* ---------- Robust compileJavaOnce (normalized hashing, lock, .ok marker) ---------- */
// const compileJavaOnce = async (userCode) => {
//   await ensureDirs();
//   const runtimeTarget = await detectJavaRuntimeRelease();

//   const normalized = normalizeJavaSource(userCode);
//   // include runtime target in cache key so classes compiled for different targets don't collide
//   const key = createHash('sha256').update(normalized + '::release=' + String(runtimeTarget)).digest('hex');
//   const execDir = path.join(compilationCacheDir, key);
//   const okMarker = path.join(execDir, '.ok');
//   const lockPath = execDir + '.lock';

//   // Quick check: if marker exists and dir has class files -> cache hit
//   try {
//     const okStat = await fs.stat(okMarker).catch(() => null);
//     if (okStat) {
//       if (await dirHasClassFiles(execDir)) return execDir;
//     } else {
//       if (await dirHasClassFiles(execDir)) {
//         try { await fs.writeFile(okMarker, `ok\n`); } catch (_) {}
//         return execDir;
//       }
//     }
//   } catch (e) {
//     // continue to compile
//   }

//   // ensure cache parent exists
//   await fs.mkdir(compilationCacheDir, { recursive: true });

//   // attempt to acquire lock (create lock file using wx)
//   let lockHandle = null;
//   const acquireLock = async () => {
//     try {
//       lockHandle = await fs.open(lockPath, 'wx'); // throws if exists
//       try { await lockHandle.writeFile(`${process.pid}\n${new Date().toISOString()}\nrelease:${runtimeTarget}\n`); } catch (_) {}
//       return true;
//     } catch (err) {
//       return false;
//     }
//   };

//   const waitForCache = async (timeoutMs = DEFAULT_LOCK_WAIT_MS, pollInterval = DEFAULT_POLL_INTERVAL_MS) => {
//     const start = Date.now();
//     while (Date.now() - start < timeoutMs) {
//       try {
//         const ok = await fs.stat(okMarker).catch(() => null);
//         if (ok && await dirHasClassFiles(execDir)) return execDir;
//         if (await dirHasClassFiles(execDir)) return execDir;
//       } catch (_) {}
//       await new Promise(r => setTimeout(r, pollInterval));
//     }
//     throw new Error('Timeout waiting for compilation cache');
//   };

//   const gotLock = await acquireLock();
//   if (!gotLock) {
//     try {
//       return await waitForCache();
//     } catch (waitErr) {
//       const reacquired = await acquireLock();
//       if (!reacquired) {
//         if (await dirHasClassFiles(execDir)) {
//           try { await fs.writeFile(okMarker, `ok\n`); } catch (_) {}
//           return execDir;
//         }
//         throw new Error('Could not acquire compilation lock and cache did not appear');
//       }
//     }
//   }

//   // We hold the lock here
//   let tmpDir = null;
//   try {
//     if (await dirHasClassFiles(execDir)) {
//       try { await fs.writeFile(okMarker, `ok\n`); } catch (_) {}
//       return execDir;
//     }

//     await cleanupOldTmpDirs(compilationCacheDir, key);

//     tmpDir = path.join(compilationCacheDir, `${key}.tmp-${nanoid(6)}`);
//     await fs.mkdir(tmpDir, { recursive: true });

//     // sanitize + prepare source file in tmp
//     let code = userCode.replace(/^package\s+[^;]+;?/mg, '');
//     code = code.replace(/public\s+class\s+Solution/g, 'class Solution');
//     const solPath = path.join(tmpDir, 'Solution.java');
//     await fs.writeFile(solPath, code, 'utf8');

//     // compile with compatibility flags
//     const compileResult = await runJavacWithCompatibility(solPath, tmpDir, runtimeTarget);
//     // runJavacWithCompatibility throws on fatal failure; if it returned, result.code === 0
//     // success -> atomic rename
//     try {
//       await fs.rename(tmpDir, execDir);
//       tmpDir = null;
//       try { await fs.writeFile(okMarker, `ok\n${new Date().toISOString()}\nrelease:${runtimeTarget}\n`); } catch (_) {}
//       return execDir;
//     } catch (renameErr) {
//       // someone else may have created execDir concurrently
//       try {
//         const st = await fs.stat(execDir).catch(() => null);
//         if (st) {
//           await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
//           tmpDir = null;
//           try { await fs.writeFile(okMarker, `ok\n${new Date().toISOString()}\nrelease:${runtimeTarget}\n`); } catch (_) {}
//           return execDir;
//         } else {
//           await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
//           tmpDir = null;
//           throw new Error('Failed to place compiled classes into cache: ' + String(renameErr));
//         }
//       } catch (e) {
//         await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
//         tmpDir = null;
//         throw e;
//       }
//     }
//   } finally {
//     try {
//       if (lockHandle) { await lockHandle.close().catch(() => {}); }
//       await fs.rm(lockPath, { force: true }).catch(() => {});
//     } catch (_) {}
//     if (tmpDir) {
//       try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (_) {}
//     }
//   }
// };

// /* ---------- run Java process ---------- */
// const runJavaProcess = (execDir, inputLines, timeout = 20000) => {
//   return new Promise((resolve, reject) => {
//     const classpath = mainBinDir + path.delimiter + execDir;
//     const runner = spawn('java', ['-cp', classpath, 'Main'], { cwd: execDir });
//     let stdout = '', stderr = '';

//     const timer = setTimeout(() => {
//       try { runner.kill('SIGKILL'); } catch (_) {}
//       reject(new Error('Time Limit Exceeded'));
//     }, timeout);

//     if (runner.stdout) runner.stdout.on('data', d => stdout += d.toString());
//     if (runner.stderr) runner.stderr.on('data', d => stderr += d.toString());

//     runner.on('error', err => {
//       clearTimeout(timer);
//       reject(err);
//     });

//     runner.on('close', (code) => {
//       clearTimeout(timer);
//       resolve({ stdout, stderr, code });
//     });

//     try {
//       const inputData = Array.isArray(inputLines) ? inputLines.join('\n') : inputLines;
//       runner.stdin.write(inputData + '\n');
//       runner.stdin.end();
//     } catch (err) {
//       // ignore
//     }
//   });
// };

// /* ---------- Execute helpers (unchanged logic) ---------- */
// const executeJavaAll = async (userCode, testCases) => {
//   await ensureMainCompiled();
//   try {
//     const execDir = await compileJavaOnce(userCode);
//     const lines = testCases.map(tc => {
//       try { return JSON.stringify(parseInputStringToArgs(tc.input)); } 
//       catch (e) { return JSON.stringify([tc.input]); }
//     });

//     const { stdout, stderr } = await runJavaProcess(execDir, lines, 20000);

//     if (stderr && stderr.trim()) {
//       if (stderr.includes('java.lang.OutOfMemoryError')) {
//         throw new Error('Memory Limit Exceeded');
//       }
//       throw new Error(`Java Runtime Error: ${stderr}`);
//     }

//     const outputs = stdout.trim().split('\n').filter(Boolean);
//     const results = outputs.map(o => o.startsWith('ERROR:') ? { success: false, error: o.substring(6) } : { success: true, output: o });

//     while (results.length < testCases.length) {
//       results.push({ success: false, error: 'Execution timed out or produced no output.' });
//     }

//     return results;
//   } catch (err) {
//     throw err;
//   }
// };

// const executeJava = async (userCode, input) => {
//   await ensureMainCompiled();
//   try {
//     const execDir = await compileJavaOnce(userCode);
//     const line = JSON.stringify(parseInputStringToArgs(input || ""));

//     const { stdout, stderr } = await runJavaProcess(execDir, [line], 5000);

//     if (stderr && stderr.trim()) {
//       if (stderr.includes('java.lang.OutOfMemoryError')) {
//         return { type: 'error', message: 'Memory Limit Exceeded' };
//       }
//       throw new Error(`Java Runtime Error: ${stderr}`);
//     }

//     const outTrim = stdout.trim();
//     if (outTrim.startsWith('ERROR:')) {
//       const errorBody = outTrim.substring(6);
//       const firstLine = errorBody.split('\n')[0];
//       return { type: 'error', message: `Runtime Error: ${firstLine}` };
//     }

//     return { type: 'success', output: outTrim };

//   } catch (err) {
//     return { type: 'error', message: err.message || String(err) };
//   }
// };

// /* ---------- JS / Python execution helpers (kept same) ---------- */
// const cleanupPath = async (fileOrDirPath) => {
//   try { await fs.rm(fileOrDirPath, { recursive: true, force: true }); } catch (error) {}
// };

// const executeAllTestCasesJS = (code, testCases) => {
//   return new Promise(async (resolve, reject) => {
//     const uniqueId = nanoid(8);
//     const tempFileName = `script-${uniqueId}.js`;
//     const tempFilePath = path.join(tempDir, tempFileName);
//     const allInputs = buildAllInputsForTestCases(testCases);
//     const BATCH_TIMEOUT = 20000;

//     const wrappedCode = `
// ${code}
// (async () => {
//   try {
//     if (typeof solve !== 'function') throw new Error("A 'solve' function was not found.");
//     const allTestInputs = JSON.parse(process.argv[2]);
//     const results = [];
//     for (const args of allTestInputs) {
//       try {
//         const res = Array.isArray(args) ? await solve(...args) : await solve(args);
//         results.push({ success: true, output: JSON.stringify(res === undefined ? null : res) });
//       } catch (e) {
//         results.push({ success: false, error: (e && e.stack) ? (e.name + ': ' + e.message + '\\n' + e.stack) : (e ? e.toString() : 'Unknown error') });
//       }
//     }
//     console.log(JSON.stringify(results));
//   } catch (err) {
//     console.error("Execution Engine Error: " + (err && err.stack ? err.stack : err));
//     process.exit(1);
//   }
// })();
//     `;
//     try {
//       await fs.writeFile(tempFilePath, wrappedCode);
//       const child = spawn('node', [tempFilePath, allInputs], { timeout: BATCH_TIMEOUT });
//       handleBatchChild(child, tempFilePath, resolve, reject);
//     } catch (err) { reject(err); }
//   });
// };

// const executeJavaScript = (code, input) => {
//   return new Promise(async (resolve, reject) => {
//     const uniqueId = nanoid(8);
//     const tempFilePath = path.join(tempDir, `script-${uniqueId}.js`);
//     const args = parseInputStringToArgs(input || "");
//     const argsJson = JSON.stringify([args]);
//     const wrappedCode = `
// ${code}
// (async () => {
//   try {
//     if (typeof solve !== 'function') throw new Error("A 'solve' function was not found.");
//     const allTestInputs = JSON.parse(process.argv[2]);
//     const args = allTestInputs[0];
//     const res = Array.isArray(args) ? await solve(...args) : await solve(args);
//     console.log(JSON.stringify(res === undefined ? null : res));
//   } catch (e) {
//     console.error(e.name + ": " + e.message);
//     process.exit(1);
//   }
// })();
//     `;
//     try {
//       await fs.writeFile(tempFilePath, wrappedCode);
//       const child = spawn('node', [tempFilePath, argsJson], { timeout: 5000 });
//       handleSingleChild(child, tempFilePath, resolve, reject);
//     } catch (err) { reject({ type: 'error', message: err.message }); }
//   });
// };

// const executePythonAll = (code, testCases) => {
//   return new Promise(async (resolve, reject) => {
//     const uniqueId = nanoid(8);
//     const tempFileName = `script-${uniqueId}.py`;
//     const tempFilePath = path.join(tempDir, tempFileName);
//     const allInputs = buildAllInputsForTestCases(testCases);
//     const BATCH_TIMEOUT = 20000;

//     const wrappedCode = `
// import sys, json, traceback, asyncio
// ${code}
// def run_sync(func, args):
//     return func(*args) if isinstance(args, list) else func(args)
// async def run_all():
//     try:
//         if 'solve' not in globals():
//             raise NameError("A 'solve' function was not found.")
//         all_inputs = json.loads(sys.argv[1])
//         results = []
//         for args in all_inputs:
//             try:
//                 if asyncio.iscoroutinefunction(solve):
//                     res = await solve(*args) if isinstance(args, list) else await solve(args)
//                 else:
//                     res = run_sync(solve, args if isinstance(args, list) else [args])
//                 results.append({ "success": True, "output": json.dumps(None if res is None else res) })
//             except Exception as e:
//                 results.append({ "success": False, "error": str(e) + "\\n" + traceback.format_exc() })
//         print(json.dumps(results))
//     except Exception as e:
//         print("Execution Engine Error: " + str(e), file=sys.stderr)
//         sys.exit(1)
// if __name__ == "__main__":
//     import asyncio
//     asyncio.run(run_all())
//     `;

//     try {
//       await fs.writeFile(tempFilePath, wrappedCode);
//       const child = spawn('python3', [tempFilePath, allInputs], { timeout: BATCH_TIMEOUT });
//       handleBatchChild(child, tempFilePath, resolve, reject);
//     } catch (err) { reject(err); }
//   });
// };

// const executePython = (code, input) => {
//   return new Promise(async (resolve, reject) => {
//     const uniqueId = nanoid(8);
//     const tempFilePath = path.join(tempDir, `script-${uniqueId}.py`);
//     const args = parseInputStringToArgs(input || "");
//     const argsJson = JSON.stringify([args]);
//     const wrappedCode = `
// import sys, json, traceback
// ${code}
// def main():
//     try:
//         if 'solve' not in globals():
//             raise NameError("A 'solve' function was not found.")
//         all_inputs = json.loads(sys.argv[1])
//         args = all_inputs[0]
//         res = solve(*args) if isinstance(args, list) else solve(args)
//         print(json.dumps(None if res is None else res))
//     except Exception as e:
//         print(str(e) + "\\n" + traceback.format_exc(), file=sys.stderr)
//         sys.exit(1)
// if __name__ == '__main__':
//     main()
//     `;
//     try {
//       await fs.writeFile(tempFilePath, wrappedCode);
//       const child = spawn('python3', [tempFilePath, argsJson], { timeout: 5000 });
//       handleSingleChild(child, tempFilePath, resolve, reject);
//     } catch (err) { reject({ type: 'error', message: err.message }); }
//   });
// };

// const handleBatchChild = (child, tempFilePath, resolve, reject) => {
//   let stdout = '', stderr = '';
//   if (child.stdout) child.stdout.on('data', d => stdout += d.toString());
//   if (child.stderr) child.stderr.on('data', d => stderr += d.toString());
//   child.on('close', async () => {
//     await cleanupPath(tempFilePath);
//     if (stderr && stderr.trim()) return reject(new Error(stderr.trim()));
//     try {
//       const parsed = JSON.parse(stdout.trim());
//       resolve(parsed);
//     } catch (e) {
//       reject(new Error('Failed to parse execution results: ' + stdout));
//     }
//   });
//   child.on('error', async (err) => { await cleanupPath(tempFilePath); reject(err); });
// };

// const handleSingleChild = (child, tempFilePath, resolve, reject) => {
//   let stdout = '', stderr = '';
//   if (child.stdout) child.stdout.on('data', d => stdout += d.toString());
//   if (child.stderr) child.stderr.on('data', d => stderr += d.toString());
//   child.on('close', async () => {
//     await cleanupPath(tempFilePath);
//     if (stderr && stderr.trim()) return reject({ type: 'error', message: stderr.trim() });
//     try {
//       const outTrim = stdout.trim();
//       try {
//         const parsed = JSON.parse(outTrim);
//         resolve({ type: 'success', output: parsed });
//       } catch (e) {
//         resolve({ type: 'success', output: outTrim });
//       }
//     } catch (e) {
//       reject({ type: 'error', message: e.message });
//     }
//   });
//   child.on('error', async (err) => { await cleanupPath(tempFilePath); reject({ type: 'error', message: err.message }); });
// };

// const executeAllTestCases = (language, code, testCases) => {
//   switch (language) {
//     case 'javascript': return executeAllTestCasesJS(code, testCases);
//     case 'python': return executePythonAll(code, testCases);
//     case 'java': return executeJavaAll(code, testCases);
//     default: return Promise.reject(new Error(`Language ${language} not supported for batch execution.`));
//   }
// };

// const executeCode = (language, code, input, problemTitle, allTestCases) => {
//   switch (language) {
//     case 'javascript': return executeJavaScript(code, input);
//     case 'python': return executePython(code, input);
//     case 'java': return executeJava(code, input);
//     default: return Promise.reject({ type: 'error', message: `Language ${language} not supported.` });
//   }
// };

// export { executeCode, executeAllTestCases };






import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, '..', 'temp');

// Persistent main compilation directories
const mainSrcDir = path.join(tempDir, 'main_src');
const mainBinDir = path.join(tempDir, 'main_bin');
// Dedicated cache for compiled user solutions
const compilationCacheDir = path.join(tempDir, 'java_cache');

/* Configuration */
const DEFAULT_LOCK_WAIT_MS = 30000;     // wait for another compiler to finish
const DEFAULT_POLL_INTERVAL_MS = 150;   // poll interval while waiting
const TMP_CLEANUP_AGE_MS = 1000 * 60 * 10; // remove tmp dirs older than 10 minutes during compile

const RESULT_SEPARATOR = '__CODEIT_RESULT_SEPARATOR__';


/* Global detected Java runtime target (string like '17') */
let DETECTED_JAVA_RELEASE = null;

/* Ensure base directories exist */
const ensureDirs = async () => {
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(mainSrcDir, { recursive: true });
    await fs.mkdir(mainBinDir, { recursive: true });
    await fs.mkdir(compilationCacheDir, { recursive: true });
  } catch (err) {
    console.error('Failed to ensure base directories:', err);
    throw err;
  }
};

const spawnPromise = (command, args, opts = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, opts);
    let stdout = '', stderr = '';
    if (child.stdout) child.stdout.on('data', d => stdout += d.toString());
    if (child.stderr) child.stderr.on('data', d => stderr += d.toString());
    child.on('error', err => reject(err));
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
};

/* Detect runtime 'java -version' and extract major release (e.g., "17" or "21") */
const detectJavaRuntimeRelease = async () => {
  if (DETECTED_JAVA_RELEASE) return DETECTED_JAVA_RELEASE;
  try {
    // `java -version` prints to stderr in many JDK distributions; capture both
    const res = await spawnPromise('java', ['-version']);
    const out = (res.stdout || '') + (res.stderr || '');
    const firstLine = (out.split('\n')[0] || '').trim();
    // Typical lines:
    // java version "17.0.8"  or openjdk version "21.0.2" or java version "1.8.0_xx"
    const m = firstLine.match(/version\s+"([^"]+)"/i);
    let versionStr = m ? m[1] : null;
    if (!versionStr) {
      // try alternative tokens
      const tok = firstLine.split(' ')[2];
      versionStr = tok || null;
    }
    if (versionStr) {
      // handle "1.8.0_281" -> major 8
      if (versionStr.startsWith('1.')) {
        const parts = versionStr.split('.');
        DETECTED_JAVA_RELEASE = parts.length >= 2 ? parts[1] : '8';
      } else {
        const parts = versionStr.split('.');
        DETECTED_JAVA_RELEASE = parts[0];
      }
    } else {
      DETECTED_JAVA_RELEASE = '17'; // fallback
    }
  } catch (err) {
    DETECTED_JAVA_RELEASE = '17'; // fallback if detection fails
  }
  return DETECTED_JAVA_RELEASE;
};

/* Helper to try compiling with flags that ensure compatibility with the runtime.
   Tries --release <target> first, then -source/-target, then plain javac as a fallback.
*/
const runJavacWithCompatibility = async (sourcePath, destDir, targetRelease) => {
  const candidates = [
    ['-Xlint:none', '--release', targetRelease, '-d', destDir, sourcePath],
    ['-Xlint:none', '-source', targetRelease, '-target', targetRelease, '-d', destDir, sourcePath],
    ['-Xlint:none', '-d', destDir, sourcePath]
  ];
  let lastErr = null;
  for (const args of candidates) {
    try {
      const res = await spawnPromise('javac', args, { cwd: path.dirname(sourcePath) });
      if (res.code === 0) return res;
      lastErr = res.stderr || res.stdout || `javac exit ${res.code}`;
    } catch (err) {
      lastErr = (err && err.message) ? err.message : String(err);
    }
  }
  throw new Error(lastErr || 'javac failed');
};

/* ---------- Input parsing helpers (unchanged) ---------- */
const parseInputStringToArgs = (inputStr) => {
    if (inputStr === undefined || inputStr === null || inputStr.trim() === '') return [];
    try {
      return JSON.parse(`[${inputStr}]`);
    } catch (e) {
      try { // Handle single quotes
        return JSON.parse(`[${inputStr.replace(/'/g, '"')}]`);
      } catch (e2) { // Fallback for complex, non-JSON strings
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
        return tokens.map(tok => {
          const t = tok.trim();
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
            return t.substring(1, t.length - 1);
          if (t.toLowerCase() === 'true') return true;
          if (t.toLowerCase() === 'false') return false;
          if (t.toLowerCase() === 'null') return null;
          if (!isNaN(Number(t))) return Number(t);
          try { return JSON.parse(t); } catch (_) { return t; }
        });
      }
    }
};



const buildAllInputsForTestCases = (testCases) => {
  const all = testCases.map(tc => {
    try { return parseInputStringToArgs(tc.input); }
    catch (e) { return [tc.input]; }
  });
  return JSON.stringify(all);
};

const parseCombinedOutput = (stdout) => {
    const parts = stdout.split(RESULT_SEPARATOR);
    const logs = parts.length > 1 ? parts[0].trim().split('\n').filter(Boolean) : [];
    const output = parts.length > 1 ? parts[1].trim() : stdout.trim();
    return { logs, output };
};


/* ---------- Java runtime wrapper (Main.java) ---------- */
/* This is your reflective Main runner — unchanged in behavior */
const mainJavaContent = `
import java.io.*;
import java.lang.reflect.*;
import java.util.*;

public class Main {

    static Object parseJsonValue(String s) {
        if (s == null) return null;
        s = s.trim();
        if (s.length() == 0) return "";
        if (s.equals("null")) return null;
        if (s.equals("true")) return Boolean.TRUE;
        if (s.equals("false")) return Boolean.FALSE;
        if (s.length() >= 2) {
            int c0 = (int) s.charAt(0);
            int c1 = (int) s.charAt(s.length()-1);
            if ((c0 == 39 && c1 == 39) || (c0 == 34 && c1 == 34)) {
                return unescapeJavaString(s.substring(1, s.length()-1));
            }
        }
        if (s.startsWith("[") && s.endsWith("]")) {
            String inner = s.substring(1, s.length()-1);
            List<Object> list = new ArrayList<>();
            if (inner.trim().length() == 0) return list;
            int depth = 0;
            boolean inQuote = false;
            StringBuilder buf = new StringBuilder();
            for (int i = 0; i < inner.length(); i++) {
                char c = inner.charAt(i);
                if ((int)c == 34 && (i == 0 || inner.charAt(i-1) != (char)92)) inQuote = !inQuote;
                if (!inQuote) {
                    if (c == '[' || c == '{') depth++;
                    if (c == ']' || c == '}') depth--;
                    if (c == ',' && depth == 0) {
                        list.add(parseJsonValue(buf.toString()));
                        buf.setLength(0);
                        continue;
                    }
                }
                buf.append(c);
            }
            if (buf.length() > 0) list.add(parseJsonValue(buf.toString()));
            return list;
        }
        try {
            if (s.indexOf('.') >= 0) return Double.parseDouble(s);
            else {
                try { return Integer.parseInt(s); } catch (NumberFormatException e) { return Long.parseLong(s); }
            }
        } catch (Exception e) {
            if ((s.startsWith("\\\"") && s.endsWith("\\\"")) || (s.startsWith("\\'") && s.endsWith("\\'"))) return s.substring(1, s.length()-1);
            return s;
        }
    }

    static String unescapeJavaString(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if ((int)ch == 92) {
                if (i+1 >= s.length()) { sb.append(ch); continue; }
                char next = s.charAt(i+1);
                if (next == 'n') { sb.append('\\n'); i++; continue; }
                if (next == 't') { sb.append('\\t'); i++; continue; }
                if (next == 'r') { sb.append('\\r'); i++; continue; }
                if (next == '"') { sb.append('"'); i++; continue; }
                if (next == '\\\\') { sb.append('\\\\'); i++; continue; }
                sb.append(next); i++; continue;
            } else sb.append(ch);
        }
        return sb.toString();
    }

    static Object convertArg(Object parsed, Class<?> paramType) throws Exception {
        if (paramType.isPrimitive()) {
            if (paramType == int.class) {
                if (parsed instanceof Number) return ((Number)parsed).intValue();
                if (parsed instanceof String) return Integer.parseInt((String)parsed);
            } else if (paramType == long.class) {
                if (parsed instanceof Number) return ((Number)parsed).longValue();
                if (parsed instanceof String) return Long.parseLong((String)parsed);
            } else if (paramType == double.class) {
                if (parsed instanceof Number) return ((Number)parsed).doubleValue();
                if (parsed instanceof String) return Double.parseDouble((String)parsed);
            } else if (paramType == boolean.class) {
                if (parsed instanceof Boolean) return parsed;
                if (parsed instanceof String) return Boolean.parseBoolean((String)parsed);
            } else if (paramType == char.class) {
                if (parsed instanceof String && ((String)parsed).length() > 0) return ((String)parsed).charAt(0);
            }
        } else {
            if (Number.class.isAssignableFrom(paramType)) {
                if (parsed instanceof Number) {
                    Number n = (Number) parsed;
                    if (paramType == Integer.class) return n.intValue();
                    if (paramType == Long.class) return n.longValue();
                    if (paramType == Double.class) return n.doubleValue();
                    if (paramType == Float.class) return n.floatValue();
                }
                if (parsed instanceof String) {
                    String str = (String) parsed;
                    if (paramType == Integer.class) return Integer.valueOf(str);
                    if (paramType == Long.class) return Long.valueOf(str);
                    if (paramType == Double.class) return Double.valueOf(str);
                    if (paramType == Float.class) return Float.valueOf(str);
                }
            }
            if (paramType == String.class) {
                if (parsed == null) return null;
                if (parsed instanceof String) return parsed;
                return String.valueOf(parsed);
            }
            if (paramType == Boolean.class) {
                if (parsed instanceof Boolean) return parsed;
                if (parsed instanceof String) return Boolean.valueOf((String)parsed);
            }
            if (paramType.isArray()) {
                Class<?> comp = paramType.getComponentType();
                if (parsed instanceof List) {
                    List<?> lst = (List<?>) parsed;
                    Object arr = Array.newInstance(comp, lst.size());
                    for (int i = 0; i < lst.size(); i++) Array.set(arr, i, convertArg(lst.get(i), comp));
                    return arr;
                }
                Object arr = Array.newInstance(comp, 1);
                Array.set(arr, 0, convertArg(parsed, comp));
                return arr;
            }
            if (List.class.isAssignableFrom(paramType) || Collection.class.isAssignableFrom(paramType)) {
                if (parsed instanceof List) return parsed;
                List<Object> l = new ArrayList<>();
                l.add(parsed);
                return l;
            }
            if (paramType == Object.class) return parsed;
            if (parsed instanceof Number) {
                Number n = (Number) parsed;
                try {
                    Method valueOf = paramType.getMethod("valueOf", String.class);
                    return valueOf.invoke(null, n.toString());
                } catch (Exception ignore) {}
            }
        }
        if (parsed == null) return null;
        if (paramType.isInstance(parsed)) return parsed;
        throw new IllegalArgumentException("Cannot convert " + parsed.getClass().getName() + " to " + paramType.getName());
    }

    static Object invokeSolveReflectively(Object solInstance, List<Object> argsList) throws Exception {
        Method[] methods = solInstance.getClass().getDeclaredMethods();
        List<Method> candidates = new ArrayList<>();
        for (Method m : methods) if (m.getName().equals("solve")) candidates.add(m);

        for (Method m : candidates) {
            Class<?>[] pts = m.getParameterTypes();
            if (pts.length == argsList.size()) {
                try {
                    Object[] conv = new Object[pts.length];
                    for (int i = 0; i < pts.length; i++) conv[i] = convertArg(argsList.get(i), pts[i]);
                    m.setAccessible(true);
                    return m.invoke(solInstance, conv);
                } catch (Exception e) {}
            }
        }

        for (Method m : candidates) {
            Class<?>[] pts = m.getParameterTypes();
            if (pts.length == 1) {
                try {
                    Object conv = convertArg(argsList, pts[0]);
                    m.setAccessible(true);
                    return m.invoke(solInstance, conv);
                } catch (Exception e) {}
            }
        }

        for (Method m : candidates) {
            if (m.isVarArgs()) {
                Class<?>[] pts = m.getParameterTypes();
                int fixed = pts.length - 1;
                if (argsList.size() >= fixed) {
                    try {
                        Object[] conv = new Object[pts.length];
                        for (int i = 0; i < fixed; i++) conv[i] = convertArg(argsList.get(i), pts[i]);
                        Class<?> varComp = pts[pts.length - 1].getComponentType();
                        int varlen = argsList.size() - fixed;
                        Object vararr = Array.newInstance(varComp, varlen);
                        for (int i = 0; i < varlen; i++) Array.set(vararr, i, convertArg(argsList.get(fixed + i), varComp));
                        conv[conv.length - 1] = vararr;
                        m.setAccessible(true);
                        return m.invoke(solInstance, conv);
                    } catch (Exception e) {}
                }
            }
        }

        for (Method m : candidates) {
            if (m.getParameterTypes().length == 0) {
                m.setAccessible(true);
                return m.invoke(solInstance);
            }
        }

        throw new NoSuchMethodException("No suitable solve(...) method found for provided arguments.");
    }

    static String toJsonLike(Object val) {
        if (val == null) return "null";
        if (val instanceof String) return quoteAndEscape((String)val);
        if (val instanceof Boolean) return val.toString();
        if (val instanceof Number) return val.toString();
        if (val.getClass().isArray()) {
            int len = Array.getLength(val);
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            for (int i = 0; i < len; i++) {
                if (i > 0) sb.append(",");
                sb.append(toJsonLike(Array.get(val, i)));
            }
            sb.append("]");
            return sb.toString();
        }
        if (val instanceof Collection) {
            Collection<?> c = (Collection<?>) val;
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            int i = 0;
            for (Object o : c) {
                if (i++ > 0) sb.append(",");
                sb.append(toJsonLike(o));
            }
            sb.append("]");
            return sb.toString();
        }
        if (val instanceof Map) {
            Map<?, ?> m = (Map<?, ?>) val;
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            List<String> keys = new ArrayList<>();
            for (Object k : m.keySet()) keys.add(String.valueOf(k));
            Collections.sort(keys);
            int i = 0;
            for (String k : keys) {
                if (i++ > 0) sb.append(",");
                sb.append(quoteAndEscape(k)).append(":").append(toJsonLike(m.get(k)));
            }
            sb.append("}");
            return sb.toString();
        }
        return quoteAndEscape(val.toString());
    }

    static String quoteAndEscape(String s) {
        StringBuilder sb = new StringBuilder();
        sb.append((char)34);
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == (char)34) { sb.append((char)92); sb.append((char)34); }
            else if (ch == (char)92) { sb.append((char)92); sb.append((char)92); }
            else if (ch == (char)10) { sb.append((char)92); sb.append('n'); }
            else if (ch == (char)13) { sb.append((char)92); sb.append('r'); }
            else if (ch == (char)9) { sb.append((char)92); sb.append('t'); }
            else sb.append(ch);
        }
        sb.append((char)34);
        return sb.toString();
    }

    public static void main(String[] args) {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        PrintWriter out = new PrintWriter(System.out);
        try {
            Class<?> solClass = null;
            try { solClass = Class.forName("Solution"); } catch (ClassNotFoundException cnfe) {}
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.length() == 0) continue;
                try {
                    Object parsed = parseJsonValue(line);
                    List<Object> argsList;
                    if (parsed instanceof List) argsList = (List<Object>) parsed;
                    else { argsList = new ArrayList<>(); argsList.add(parsed); }
                    if (solClass == null) solClass = Class.forName("Solution");
                    Object solInstance = solClass.getDeclaredConstructor().newInstance();
                    Object result = invokeSolveReflectively(solInstance, argsList);
                    out.println(toJsonLike(result));
                } catch (Throwable e) {
                    StringWriter sw = new StringWriter();
                    e.printStackTrace(new PrintWriter(sw));
                    out.println("ERROR:" + sw.toString());
                }
            }
            out.flush();
        } catch (IOException e) {
            e.printStackTrace(System.err);
        }
    }
}
`;

/* compile Main.java once */
let mainCompiledPromise = null;
const ensureMainCompiled = async () => {
  if (mainCompiledPromise) return mainCompiledPromise;
  mainCompiledPromise = (async () => {
    await ensureDirs();
    const mainJavaPath = path.join(mainSrcDir, 'Main.java');
    await fs.writeFile(mainJavaPath, mainJavaContent, 'utf8');
    const runtimeTarget = await detectJavaRuntimeRelease();
    try {
      await runJavacWithCompatibility(mainJavaPath, mainBinDir, runtimeTarget);
    } catch (err) {
      console.error('Retrying Main.java compilation...');
      await new Promise(r => setTimeout(r, 200));
      await runJavacWithCompatibility(mainJavaPath, mainBinDir, runtimeTarget);
    }
  })();
  return mainCompiledPromise;
};

/* ---------- Normalization & utilities to reduce cache churn ---------- */
const normalizeJavaSource = (src) => {
  if (!src) return '';

  // 1) normalize line endings
  let s = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2) remove 'package ...;' lines entirely (they cause class file path shifts)
  s = s.replace(/^\s*package\s+[^;]+;.*$/mg, '');

  // 3) convert "public class Solution" to "class Solution" to avoid public requirement
  s = s.replace(/public\s+class\s+Solution/g, 'class Solution');

  // 4) remove block comments and line comments (simple approach)
  // NOTE: this is pragmatic and may remove comments inside string literals in rare cases.
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');     // block comments
  s = s.replace(/\/\/[^\n\r]*/g, '');         // line comments

  // 5) collapse whitespace sequences to single spaces and trim
  s = s.replace(/\s+/g, ' ').trim();

  return s;
};

/* check if directory contains any .class files recursively */
const dirHasClassFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (await dirHasClassFiles(full)) return true;
      } else if (e.isFile() && e.name.endsWith('.class')) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

/* remove stale tmp dirs that match pattern key.tmp-* older than threshold */
const cleanupOldTmpDirs = async (cacheDir, key, ageMs = TMP_CLEANUP_AGE_MS) => {
  try {
    const items = await fs.readdir(cacheDir, { withFileTypes: true });
    const now = Date.now();
    for (const it of items) {
      if (!it.isDirectory()) continue;
      const nm = it.name;
      if (!nm.startsWith(`${key}.tmp-`)) continue;
      const full = path.join(cacheDir, nm);
      try {
        const st = await fs.stat(full);
        if (now - st.mtimeMs > ageMs) {
          await fs.rm(full, { recursive: true, force: true }).catch(() => {});
        }
      } catch (_) {}
    }
  } catch (_) {}
};

/* ---------- Robust compileJavaOnce (normalized hashing, lock, .ok marker) ---------- */
const compileJavaOnce = async (userCode) => {
  await ensureDirs();
  const runtimeTarget = await detectJavaRuntimeRelease();

  const normalized = normalizeJavaSource(userCode);
  // include runtime target in cache key so classes compiled for different targets don't collide
  const key = createHash('sha256').update(normalized + '::release=' + String(runtimeTarget)).digest('hex');
  const execDir = path.join(compilationCacheDir, key);
  const okMarker = path.join(execDir, '.ok');
  const lockPath = execDir + '.lock';

  // Quick check: if marker exists and dir has class files -> cache hit
  try {
    const okStat = await fs.stat(okMarker).catch(() => null);
    if (okStat) {
      if (await dirHasClassFiles(execDir)) return execDir;
    } else {
      if (await dirHasClassFiles(execDir)) {
        try { await fs.writeFile(okMarker, `ok\n`); } catch (_) {}
        return execDir;
      }
    }
  } catch (e) {
    // continue to compile
  }

  // ensure cache parent exists
  await fs.mkdir(compilationCacheDir, { recursive: true });

  // attempt to acquire lock (create lock file using wx)
  let lockHandle = null;
  const acquireLock = async () => {
    try {
      lockHandle = await fs.open(lockPath, 'wx'); // throws if exists
      try { await lockHandle.writeFile(`${process.pid}\n${new Date().toISOString()}\nrelease:${runtimeTarget}\n`); } catch (_) {}
      return true;
    } catch (err) {
      return false;
    }
  };

  const waitForCache = async (timeoutMs = DEFAULT_LOCK_WAIT_MS, pollInterval = DEFAULT_POLL_INTERVAL_MS) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const ok = await fs.stat(okMarker).catch(() => null);
        if (ok && await dirHasClassFiles(execDir)) return execDir;
        if (await dirHasClassFiles(execDir)) return execDir;
      } catch (_) {}
      await new Promise(r => setTimeout(r, pollInterval));
    }
    throw new Error('Timeout waiting for compilation cache');
  };

  const gotLock = await acquireLock();
  if (!gotLock) {
    try {
      return await waitForCache();
    } catch (waitErr) {
      const reacquired = await acquireLock();
      if (!reacquired) {
        if (await dirHasClassFiles(execDir)) {
          try { await fs.writeFile(okMarker, `ok\n`); } catch (_) {}
          return execDir;
        }
        throw new Error('Could not acquire compilation lock and cache did not appear');
      }
    }
  }

  // We hold the lock here
  let tmpDir = null;
  try {
    if (await dirHasClassFiles(execDir)) {
      try { await fs.writeFile(okMarker, `ok\n`); } catch (_) {}
      return execDir;
    }

    await cleanupOldTmpDirs(compilationCacheDir, key);

    tmpDir = path.join(compilationCacheDir, `${key}.tmp-${nanoid(6)}`);
    await fs.mkdir(tmpDir, { recursive: true });

    // sanitize + prepare source file in tmp
    let code = userCode.replace(/^package\s+[^;]+;?/mg, '');
    code = code.replace(/public\s+class\s+Solution/g, 'class Solution');
    const solPath = path.join(tmpDir, 'Solution.java');
    await fs.writeFile(solPath, code, 'utf8');

    // compile with compatibility flags
    const compileResult = await runJavacWithCompatibility(solPath, tmpDir, runtimeTarget);
    // runJavacWithCompatibility throws on fatal failure; if it returned, result.code === 0
    // success -> atomic rename
    try {
      await fs.rename(tmpDir, execDir);
      tmpDir = null;
      try { await fs.writeFile(okMarker, `ok\n${new Date().toISOString()}\nrelease:${runtimeTarget}\n`); } catch (_) {}
      return execDir;
    } catch (renameErr) {
      // someone else may have created execDir concurrently
      try {
        const st = await fs.stat(execDir).catch(() => null);
        if (st) {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          tmpDir = null;
          try { await fs.writeFile(okMarker, `ok\n${new Date().toISOString()}\nrelease:${runtimeTarget}\n`); } catch (_) {}
          return execDir;
        } else {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          tmpDir = null;
          throw new Error('Failed to place compiled classes into cache: ' + String(renameErr));
        }
      } catch (e) {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        tmpDir = null;
        throw e;
      }
    }
  } finally {
    try {
      if (lockHandle) { await lockHandle.close().catch(() => {}); }
      await fs.rm(lockPath, { force: true }).catch(() => {});
    } catch (_) {}
    if (tmpDir) {
      try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  }
};

/* ---------- run Java process ---------- */
const runJavaProcess = (execDir, inputLines, timeout = 20000) => {
  return new Promise((resolve, reject) => {
    const classpath = mainBinDir + path.delimiter + execDir;
    const runner = spawn('java', ['-cp', classpath, 'Main'], { cwd: execDir });
    let stdout = '', stderr = '';

    const timer = setTimeout(() => {
      try { runner.kill('SIGKILL'); } catch (_) {}
      reject(new Error('Time Limit Exceeded'));
    }, timeout);

    if (runner.stdout) runner.stdout.on('data', d => stdout += d.toString());
    if (runner.stderr) runner.stderr.on('data', d => stderr += d.toString());

    runner.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });

    runner.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    try {
      const inputData = Array.isArray(inputLines) ? inputLines.join('\n') : inputLines;
      runner.stdin.write(inputData + '\n');
      runner.stdin.end();
    } catch (err) {
      // ignore
    }
  });
};

/* ---------- Execute helpers (unchanged logic) ---------- */
const executeJavaAll = async (userCode, testCases) => {
  await ensureMainCompiled();
  try {
    const execDir = await compileJavaOnce(userCode);
    const lines = testCases.map(tc => {
      try { return JSON.stringify(parseInputStringToArgs(tc.input)); } 
      catch (e) { return JSON.stringify([tc.input]); }
    });

    const { stdout, stderr } = await runJavaProcess(execDir, lines, 20000);

    if (stderr && stderr.trim()) {
      if (stderr.includes('java.lang.OutOfMemoryError')) {
        throw new Error('Memory Limit Exceeded');
      }
      throw new Error(`Java Runtime Error: ${stderr}`);
    }

    const outputs = stdout.trim().split('\n').filter(Boolean);
    const results = outputs.map(o => o.startsWith('ERROR:') ? { success: false, error: o.substring(6) } : { success: true, output: o });

    while (results.length < testCases.length) {
      results.push({ success: false, error: 'Execution timed out or produced no output.' });
    }

    return results;
  } catch (err) {
    throw err;
  }
};

const executeJava = async (userCode, input) => {
  await ensureMainCompiled();
  try {
    const execDir = await compileJavaOnce(userCode);
    const line = JSON.stringify(parseInputStringToArgs(input || ""));

    const { stdout, stderr } = await runJavaProcess(execDir, [line], 5000);

    if (stderr && stderr.trim()) {
      if (stderr.includes('java.lang.OutOfMemoryError')) {
        return { type: 'error', message: 'Memory Limit Exceeded' };
      }
      throw new Error(`Java Runtime Error: ${stderr}`);
    }

    const outTrim = stdout.trim();
    if (outTrim.startsWith('ERROR:')) {
      const errorBody = outTrim.substring(6);
      const firstLine = errorBody.split('\n')[0];
      return { type: 'error', message: `Runtime Error: ${firstLine}` };
    }

    return { type: 'success', output: outTrim };

  } catch (err) {
    return { type: 'error', message: err.message || String(err) };
  }
};

/* ---------- JS / Python execution helpers (kept same) ---------- */
const cleanupPath = async (fileOrDirPath) => {
  try { await fs.rm(fileOrDirPath, { recursive: true, force: true }); } catch (error) {}
};

const executeAllTestCasesJS = (code, testCases) => new Promise(async (resolve, reject) => {
    const tempFilePath = path.join(tempDir, `script-${nanoid(8)}.js`);
    const allInputs = buildAllInputsForTestCases(testCases);
    const wrappedCode = `
${code}
(async () => {
    try {
        if (typeof solve !== 'function') throw new Error("A 'solve' function was not found.");
        const allTestInputs = JSON.parse(process.argv[2]);
        const results = [];
        for (const args of allTestInputs) {
            try {
                const res = Array.isArray(args) ? await solve(...args) : await solve(args);
                results.push({ success: true, output: JSON.stringify(res === undefined ? null : res) });
            } catch (e) {
                results.push({ success: false, error: e.message || String(e) });
            }
        }
        console.log(JSON.stringify(results));
    } catch (err) {
        console.error("Execution Engine Error: " + err.message);
        process.exit(1);
    }
})();`;
    try {
        await fs.writeFile(tempFilePath, wrappedCode);
        const child = spawn('node', [tempFilePath, allInputs], { timeout: 20000 });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', async (code) => {
            await cleanupPath(tempFilePath);
            if (stderr.trim()) return reject(new Error(stderr.trim()));
            if (code !== 0) return reject(new Error(`Execution Timed Out`));
            try { resolve(JSON.parse(stdout.trim())); } catch (e) { reject(new Error('Failed to parse batch results.')); }
        });
        child.on('error', async (err) => { await cleanupPath(tempFilePath); reject(err); });
    } catch (err) { reject(err); }
});


const executeJavaScript = (code, input) => new Promise(async (resolve, reject) => {
    const tempFilePath = path.join(tempDir, `script-${nanoid(8)}.js`);
    const argsJson = JSON.stringify([parseInputStringToArgs(input || "")]);
    const wrappedCode = `
const __logs = [];
const __originalLog = console.log;
console.log = (...args) => {
    __logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
};
${code}
(async () => {
    try {
        if (typeof solve !== 'function') throw new Error("A 'solve' function was not found.");
        const args = JSON.parse(process.argv[2])[0];
        const res = Array.isArray(args) ? await solve(...args) : await solve(args);
        __originalLog(__logs.join('\\n'));
        __originalLog('${RESULT_SEPARATOR}');
        __originalLog(JSON.stringify(res === undefined ? null : res));
    } catch (e) {
        console.error(e.name + ": " + e.message);
        process.exit(1);
    }
})();`;
    try {
        await fs.writeFile(tempFilePath, wrappedCode);
        const child = spawn('node', [tempFilePath, argsJson], { timeout: 5000 });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', async (code) => {
            await cleanupPath(tempFilePath);
            const { logs, output } = parseCombinedOutput(stdout);
            const message = stderr.trim() || (code !== 0 ? 'Execution timed out or failed.' : '');
            if (message) return reject({ type: 'error', message, logs });
            resolve({ type: 'success', output, logs });
        });
        child.on('error', async (err) => { await cleanupPath(tempFilePath); reject({ type: 'error', message: err.message }); });
    } catch (err) { reject({ type: 'error', message: err.message }); }
});


const executePythonAll = (code, testCases) => new Promise(async (resolve, reject) => {
    const tempFilePath = path.join(tempDir, `script-${nanoid(8)}.py`);
    const allInputs = buildAllInputsForTestCases(testCases);
    const wrappedCode = `
import sys, json, traceback, asyncio
${code}
async def main():
    try:
        if 'solve' not in globals(): raise NameError("A 'solve' function was not found.")
        all_inputs = json.loads(sys.argv[1])
        results = []
        for args in all_inputs:
            try:
                if asyncio.iscoroutinefunction(solve):
                    res = await (solve(*args) if isinstance(args, list) else solve(args))
                else:
                    res = solve(*args) if isinstance(args, list) else solve(args)
                results.append({ "success": True, "output": json.dumps(res if res is not None else None) })
            except Exception as e:
                results.append({ "success": False, "error": str(e) })
        print(json.dumps(results))
    except Exception as e:
        print("Engine Error: " + str(e), file=sys.stderr)
        sys.exit(1)
if __name__ == "__main__": asyncio.run(main())`;
    try {
        await fs.writeFile(tempFilePath, wrappedCode);
        const child = spawn('python3', [tempFilePath, allInputs], { timeout: 20000 });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', async (code) => {
            await cleanupPath(tempFilePath);
            if (stderr.trim()) return reject(new Error(stderr.trim()));
            if (code !== 0) return reject(new Error(`Execution Timed Out`));
            try { resolve(JSON.parse(stdout.trim())); } catch (e) { reject(new Error('Failed to parse batch results.')); }
        });
        child.on('error', async (err) => { await cleanupPath(tempFilePath); reject(err); });
    } catch (err) { reject(err); }
});


const executePython = (code, input) => new Promise(async (resolve, reject) => {
    const tempFilePath = path.join(tempDir, `script-${nanoid(8)}.py`);
    const argsJson = JSON.stringify([parseInputStringToArgs(input || "")]);
    const wrappedCode = `
import sys, json, traceback
${code}
def main():
    try:
        if 'solve' not in globals():
            raise NameError("A 'solve' function was not found.")
        args = json.loads(sys.argv[1])[0]
        res = solve(*args) if isinstance(args, list) else solve(args)
        print('${RESULT_SEPARATOR}')
        print(json.dumps(None if res is None else res))
    except Exception as e:
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)
if __name__ == '__main__':
    main()`;
    try {
        await fs.writeFile(tempFilePath, wrappedCode);
        const child = spawn('python3', [tempFilePath, argsJson], { timeout: 5000 });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', async (code) => {
            await cleanupPath(tempFilePath);
            const { logs, output } = parseCombinedOutput(stdout);
            const message = stderr.trim() || (code !== 0 ? 'Execution timed out or failed.' : '');
            if (message) return reject({ type: 'error', message, logs });
            resolve({ type: 'success', output, logs });
        });
        child.on('error', async (err) => { await cleanupPath(tempFilePath); reject({ type: 'error', message: err.message }); });
    } catch (err) { reject({ type: 'error', message: err.message }); }
});



const handleBatchChild = (child, tempFilePath, resolve, reject) => {
  let stdout = '', stderr = '';
  if (child.stdout) child.stdout.on('data', d => stdout += d.toString());
  if (child.stderr) child.stderr.on('data', d => stderr += d.toString());
  child.on('close', async () => {
    await cleanupPath(tempFilePath);
    if (stderr && stderr.trim()) return reject(new Error(stderr.trim()));
    try {
      const parsed = JSON.parse(stdout.trim());
      resolve(parsed);
    } catch (e) {
      reject(new Error('Failed to parse execution results: ' + stdout));
    }
  });
  child.on('error', async (err) => { await cleanupPath(tempFilePath); reject(err); });
};

const handleSingleChild = (child, tempFilePath, resolve, reject) => {
  let stdout = '', stderr = '';
  if (child.stdout) child.stdout.on('data', d => stdout += d.toString());
  if (child.stderr) child.stderr.on('data', d => stderr += d.toString());
  child.on('close', async () => {
    await cleanupPath(tempFilePath);
    if (stderr && stderr.trim()) return reject({ type: 'error', message: stderr.trim() });
    try {
      const outTrim = stdout.trim();
      try {
        const parsed = JSON.parse(outTrim);
        resolve({ type: 'success', output: parsed });
      } catch (e) {
        resolve({ type: 'success', output: outTrim });
      }
    } catch (e) {
      reject({ type: 'error', message: e.message });
    }
  });
  child.on('error', async (err) => { await cleanupPath(tempFilePath); reject({ type: 'error', message: err.message }); });
};

const executeAllTestCases = (language, code, testCases) => {
  switch (language) {
    case 'javascript': return executeAllTestCasesJS(code, testCases);
    case 'python': return executePythonAll(code, testCases);
    case 'java': return executeJavaAll(code, testCases);
    default: return Promise.reject(new Error(`Language ${language} not supported for batch execution.`));
  }
};

const executeCode = (language, code, input, problemTitle, allTestCases) => {
  switch (language) {
    case 'javascript': return executeJavaScript(code, input);
    case 'python': return executePython(code, input);
    case 'java': return executeJava(code, input);
    default: return Promise.reject({ type: 'error', message: `Language ${language} not supported.` });
  }
};

export { executeCode, executeAllTestCases };
